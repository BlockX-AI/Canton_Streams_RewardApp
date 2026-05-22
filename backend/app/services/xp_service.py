from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from app.db import execute, fetch, fetch_all, fetch_val
from app.models.xp import XPEvent, XPAward, LeaderboardStats
from app.services.campaign_service import award_campaign_xp


ONE_TIME_REASONS = ["INITIAL_AWARD", "MERGE_BONUS", "VIRAL_BONUS", "RESHARE_BONUS"]
REFERRAL_BONUS_PCT = 0.05


async def award_xp(data: XPAward) -> XPEvent | None:
    if data.reason in ONE_TIME_REASONS and data.contribution_id:
        existing = await fetch(
            """
            SELECT id FROM xp_events
            WHERE wallet = $1 AND reason = $2 AND contribution_id = $3
            LIMIT 1
            """,
            data.wallet,
            data.reason,
            data.contribution_id,
        )
        if existing:
            return None

    row = await fetch(
        """
        INSERT INTO xp_events (wallet, xp_delta, reason, contribution_id, campaign_id, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
        """,
        data.wallet,
        data.xp_delta,
        data.reason,
        data.contribution_id,
        data.campaign_id,
    )

    if not row:
        raise RuntimeError("Failed to create XP event")

    # Recalculate total XP
    sum_row = await fetch_val(
        "SELECT COALESCE(SUM(xp_delta), 0) FROM xp_events WHERE wallet = $1",
        data.wallet,
    )
    total = int(sum_row or 0)

    await execute(
        "UPDATE participants SET total_xp = $1, updated_at = NOW() WHERE wallet = $2",
        total,
        data.wallet,
    )

    # Award campaign XP if campaign_id provided
    if data.campaign_id:
        try:
            await award_campaign_xp(data.campaign_id, data.wallet, data.xp_delta)
        except Exception as e:
            print(f"[xp] Campaign XP award failed for {data.wallet} in {data.campaign_id}: {e}")

    # Award referral bonus (skip if this is a referral bonus to avoid recursion)
    if data.reason != "REFERRAL_BONUS" and data.xp_delta > 0:
        try:
            await award_referral_bonus(data.wallet, data.xp_delta, data.contribution_id)
        except Exception as e:
            print(f"[xp] Referral bonus failed for {data.wallet}: {e}")

    return _row_to_xp_event(row)


async def award_referral_bonus(wallet: str, xp_delta: int, contribution_id: int | None) -> XPEvent | None:
    # Look up referrer
    row = await fetch(
        """
        SELECT u.referred_by FROM users u
        JOIN participants p ON p.wallet = u.wallet
        WHERE p.wallet = $1
        """,
        wallet,
    )
    if not row or not row["referred_by"]:
        return None

    # Find referrer's wallet
    referrer_row = await fetch(
        """
        SELECT p.wallet FROM participants p
        JOIN users u ON u.id = p.user_id
        WHERE u.id = $1
        """,
        row["referred_by"],
    )
    if not referrer_row:
        return None

    bonus = max(1, int(xp_delta * REFERRAL_BONUS_PCT))

    # Idempotency check
    if contribution_id:
        existing = await fetch(
            """
            SELECT id FROM xp_events
            WHERE wallet = $1 AND reason = 'REFERRAL_BONUS' AND contribution_id = $2
            LIMIT 1
            """,
            referrer_row["wallet"],
            contribution_id,
        )
        if existing:
            return None

    bonus_row = await fetch(
        """
        INSERT INTO xp_events (wallet, xp_delta, reason, contribution_id, created_at)
        VALUES ($1, $2, 'REFERRAL_BONUS', $3, NOW())
        RETURNING *
        """,
        referrer_row["wallet"],
        bonus,
        contribution_id,
    )

    if not bonus_row:
        return None

    # Update referrer total
    sum_row = await fetch_val(
        "SELECT COALESCE(SUM(xp_delta), 0) FROM xp_events WHERE wallet = $1",
        referrer_row["wallet"],
    )
    total = int(sum_row or 0)

    await execute(
        "UPDATE participants SET total_xp = $1, updated_at = NOW() WHERE wallet = $2",
        total,
        referrer_row["wallet"],
    )

    return _row_to_xp_event(bonus_row)


async def get_leaderboard(page: int = 1, limit: int = 50, track: str | None = None) -> dict[str, Any]:
    offset = (page - 1) * limit

    conditions = ["total_xp > 0"]
    params = []
    idx = 1

    if track and track in ["OSS", "CONTENT", "BOTH"]:
        conditions.append(f"track = ${idx}")
        params.append(track)
        idx += 1

    where = f"WHERE {' AND '.join(conditions)}"
    params.extend([limit, offset])

    rows = await fetch_all(
        f"""
        SELECT wallet, display_name, github_handle, x_handle, track, total_xp
        FROM participants
        {where}
        ORDER BY total_xp DESC
        LIMIT ${idx} OFFSET ${idx + 1}
        """,
        *params,
    )

    count = await fetch_val(f"SELECT COUNT(*) FROM participants {where}", *params[:-2])

    entries = []
    for i, row in enumerate(rows):
        entries.append(
            {
                "rank": offset + i + 1,
                "wallet": row["wallet"],
                "display_name": row["display_name"] or row["github_handle"] or row["x_handle"] or row["wallet"],
                "github_handle": row["github_handle"],
                "x_handle": row["x_handle"],
                "track": row["track"],
                "total_xp": row["total_xp"],
            }
        )

    return {
        "entries": entries,
        "total": int(count or 0),
        "page": page,
        "limit": limit,
    }


async def get_leaderboard_stats() -> LeaderboardStats:
    total_participants = await fetch_val(
        "SELECT COUNT(*) FROM participants WHERE total_xp > 0"
    )

    total_xp = await fetch_val(
        "SELECT COALESCE(SUM(total_xp), 0) FROM participants WHERE total_xp > 0"
    )

    total_contributions = await fetch_val(
        "SELECT COUNT(*) FROM contributions WHERE status NOT IN ('REJECTED', 'DELETED')"
    )

    oss_contributions = await fetch_val(
        "SELECT COUNT(*) FROM contributions WHERE track = 'OSS' AND status NOT IN ('REJECTED', 'DELETED')"
    )

    content_contributions = await fetch_val(
        "SELECT COUNT(*) FROM contributions WHERE track = 'CONTENT' AND status NOT IN ('REJECTED', 'DELETED')"
    )

    top_row = await fetch(
        """
        SELECT wallet, display_name, github_handle, x_handle, total_xp, track
        FROM participants
        WHERE total_xp > 0
        ORDER BY total_xp DESC
        LIMIT 1
        """
    )

    top_contributor = None
    if top_row:
        top_contributor = {
            "wallet": top_row["wallet"],
            "display_name": top_row["display_name"] or top_row["github_handle"] or top_row["x_handle"] or top_row["wallet"],
            "total_xp": top_row["total_xp"],
            "track": top_row["track"],
        }

    return LeaderboardStats(
        total_participants=int(total_participants or 0),
        total_xp=int(total_xp or 0),
        total_contributions=int(total_contributions or 0),
        oss_contributions=int(oss_contributions or 0),
        content_contributions=int(content_contributions or 0),
        top_contributor=top_contributor,
        campaign_days_remaining=None,
        pool_cc=0.0,
    )


def _row_to_xp_event(row: dict[str, Any]) -> XPEvent:
    return XPEvent(
        id=row["id"],
        wallet=row["wallet"],
        xp_delta=row["xp_delta"],
        reason=row["reason"],
        contribution_id=row["contribution_id"],
        campaign_id=UUID(row["campaign_id"]) if row["campaign_id"] else None,
        created_at=row["created_at"],
    )
