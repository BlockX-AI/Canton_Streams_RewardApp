from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from app.db import execute, fetch, fetch_all, fetch_val
from app.models.campaigns import (
    Campaign,
    CampaignCreate,
    CampaignEnroll,
    CampaignFund,
    CampaignLeaderboard,
    CampaignParticipant,
    CampaignPayoutPreview,
    CampaignStatus,
    LeaderboardEntry,
    PayoutPreview,
    TrackType,
)


async def create_campaign(data: CampaignCreate) -> Campaign:
    campaign_id = uuid4()
    now = datetime.utcnow()

    row = await fetch(
        """
        INSERT INTO campaigns (
            id, creator_wallet, title, description,
            pool_amount, pool_remaining, token, status, track_type,
            start_date, end_date,
            required_hashtags, required_mentions,
            github_repo_url, github_issue_labels,
            max_oss_contributions, max_content_contributions, score_threshold,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $5, $6, 'DRAFT', $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
        """,
        campaign_id,
        data.creator_wallet,
        data.title,
        data.description,
        data.pool_amount,
        data.token,
        data.track_type.value,
        data.start_date,
        data.end_date,
        data.required_hashtags,
        data.required_mentions,
        data.github_repo_url,
        data.github_issue_labels,
        data.max_oss_contributions,
        data.max_content_contributions,
        data.score_threshold,
        now,
        now,
    )

    if not row:
        raise RuntimeError("Failed to create campaign")

    return _row_to_campaign(row)


async def fund_campaign(campaign_id: UUID, wallet: str, data: CampaignFund) -> Campaign:
    row = await fetch("SELECT * FROM campaigns WHERE id = $1", campaign_id)
    if not row:
        raise ValueError("Campaign not found")

    if row["creator_wallet"] != wallet and wallet != "PLATFORM":
        raise ValueError("Only creator can fund campaign")

    if row["status"] != CampaignStatus.DRAFT.value:
        raise ValueError(f"Cannot fund campaign in status: {row['status']}")

    now = datetime.utcnow()
    start_date = row["start_date"]
    new_status = CampaignStatus.ACTIVE if start_date <= now else CampaignStatus.FUNDED

    updated = await fetch(
        """
        UPDATE campaigns
        SET status = $1, funding_tx_hash = $2, pool_remaining = pool_amount, updated_at = $3
        WHERE id = $4
        RETURNING *
        """,
        new_status.value,
        data.tx_hash,
        now,
        campaign_id,
    )

    if not updated:
        raise RuntimeError("Failed to fund campaign")

    return _row_to_campaign(updated)


async def get_campaign(campaign_id: UUID) -> Campaign:
    row = await fetch(
        """
        SELECT c.*,
               (SELECT COUNT(*) FROM campaign_participants cp WHERE cp.campaign_id = c.id) AS participant_count
        FROM campaigns c WHERE c.id = $1
        """,
        campaign_id,
    )
    if not row:
        raise ValueError("Campaign not found")
    return _row_to_campaign(row)


async def list_campaigns(
    status: str | None = None,
    track_type: str | None = None,
    page: int = 1,
    limit: int = 20,
) -> dict[str, Any]:
    offset = (page - 1) * limit
    conditions = []
    params = []
    idx = 1

    if status:
        conditions.append(f"c.status = ${idx}")
        params.append(status)
        idx += 1
    if track_type:
        conditions.append(f"c.track_type = ${idx}")
        params.append(track_type)
        idx += 1

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    params.extend([limit, offset])

    rows = await fetch_all(
        f"""
        SELECT c.*,
               (SELECT COUNT(*) FROM campaign_participants cp WHERE cp.campaign_id = c.id) AS participant_count
        FROM campaigns c
        {where}
        ORDER BY c.created_at DESC
        LIMIT ${idx} OFFSET ${idx + 1}
        """,
        *params,
    )

    count_row = await fetch_val(
        f"SELECT COUNT(*) FROM campaigns c {where}",
        *params[:-2],
    )

    return {
        "campaigns": [_row_to_campaign(r) for r in rows],
        "total": int(count_row or 0),
        "page": page,
        "limit": limit,
    }


async def get_active_campaigns() -> list[Campaign]:
    rows = await fetch_all(
        """
        SELECT c.*,
               (SELECT COUNT(*) FROM campaign_participants cp WHERE cp.campaign_id = c.id) AS participant_count
        FROM campaigns c
        WHERE c.status = 'ACTIVE'
        ORDER BY c.end_date ASC
        """
    )
    return [_row_to_campaign(r) for r in rows]


async def enroll_in_campaign(campaign_id: UUID, data: CampaignEnroll) -> CampaignParticipant:
    campaign = await fetch("SELECT * FROM campaigns WHERE id = $1", campaign_id)
    if not campaign:
        raise ValueError("Campaign not found")

    if campaign["status"] != CampaignStatus.ACTIVE.value:
        raise ValueError(f"Cannot enroll - campaign status is {campaign['status']}")

    participant = await fetch("SELECT wallet FROM participants WHERE wallet = $1", data.wallet)
    if not participant:
        display_name = data.wallet[:8] + "..." + data.wallet[-4:]
        await execute(
            """
            INSERT INTO participants (wallet, display_name, track)
            VALUES ($1, $2, $3)
            ON CONFLICT (wallet) DO NOTHING
            """,
            data.wallet,
            display_name,
            campaign["track_type"] or "BOTH",
        )

    try:
        row = await fetch(
            """
            INSERT INTO campaign_participants (campaign_id, wallet)
            VALUES ($1, $2)
            RETURNING *
            """,
            campaign_id,
            data.wallet,
        )
    except Exception:
        raise ValueError("Already enrolled in this campaign")

    return _row_to_campaign_participant(row)


async def get_campaign_participants(
    campaign_id: UUID, page: int = 1, limit: int = 50
) -> dict[str, Any]:
    offset = (page - 1) * limit

    rows = await fetch_all(
        """
        SELECT cp.wallet, cp.campaign_xp, cp.enrolled_at,
               p.display_name, p.github_handle, p.x_handle, p.track
        FROM campaign_participants cp
        JOIN participants p ON p.wallet = cp.wallet
        WHERE cp.campaign_id = $1
        ORDER BY cp.campaign_xp DESC, cp.enrolled_at ASC
        LIMIT $2 OFFSET $3
        """,
        campaign_id,
        limit,
        offset,
    )

    count = await fetch_val(
        "SELECT COUNT(*) FROM campaign_participants WHERE campaign_id = $1",
        campaign_id,
    )

    return {
        "participants": [_row_to_campaign_participant(r) for r in rows],
        "total": int(count or 0),
        "page": page,
        "limit": limit,
    }


async def get_campaign_leaderboard(
    campaign_id: UUID, page: int = 1, limit: int = 50
) -> CampaignLeaderboard:
    campaign = await fetch("SELECT * FROM campaigns WHERE id = $1", campaign_id)
    if not campaign:
        raise ValueError("Campaign not found")

    offset = (page - 1) * limit

    rows = await fetch_all(
        """
        SELECT cp.wallet, cp.campaign_xp, cp.enrolled_at,
               p.display_name, p.github_handle, p.x_handle, p.track
        FROM campaign_participants cp
        JOIN participants p ON p.wallet = cp.wallet
        WHERE cp.campaign_id = $1
        ORDER BY cp.campaign_xp DESC, cp.enrolled_at ASC
        LIMIT $2 OFFSET $3
        """,
        campaign_id,
        limit,
        offset,
    )

    total_xp = await fetch_val(
        "SELECT COALESCE(SUM(campaign_xp), 0) FROM campaign_participants WHERE campaign_id = $1",
        campaign_id,
    )

    total_participants = await fetch_val(
        "SELECT COUNT(*) FROM campaign_participants WHERE campaign_id = $1",
        campaign_id,
    )

    pool_amount = Decimal(campaign["pool_amount"])

    entries = []
    for i, row in enumerate(rows):
        rank = offset + i + 1
        campaign_xp = row["campaign_xp"]
        estimated_cc = (campaign_xp / (total_xp or 1)) * pool_amount if total_xp else Decimal("0")

        entries.append(
            LeaderboardEntry(
                rank=rank,
                wallet=row["wallet"],
                display_name=row["display_name"] or row["github_handle"] or row["x_handle"] or row["wallet"],
                github_handle=row["github_handle"],
                x_handle=row["x_handle"],
                track=TrackType(row["track"]) if row["track"] else None,
                campaign_xp=campaign_xp,
                estimated_cc=estimated_cc,
            )
        )

    return CampaignLeaderboard(
        campaign_id=campaign_id,
        title=campaign["title"],
        status=CampaignStatus(campaign["status"]),
        pool_amount=pool_amount,
        total_xp=int(total_xp or 0),
        total_participants=int(total_participants or 0),
        page=page,
        limit=limit,
        entries=entries,
    )


async def award_campaign_xp(campaign_id: UUID, wallet: str, xp_delta: int) -> CampaignParticipant | None:
    row = await fetch(
        """
        UPDATE campaign_participants
        SET campaign_xp = campaign_xp + $1
        WHERE campaign_id = $2 AND wallet = $3
        RETURNING *
        """,
        xp_delta,
        campaign_id,
        wallet,
    )

    if not row:
        return None

    return _row_to_campaign_participant(row)


async def get_campaign_payout_preview(campaign_id: UUID) -> CampaignPayoutPreview:
    campaign = await fetch("SELECT * FROM campaigns WHERE id = $1", campaign_id)
    if not campaign:
        raise ValueError("Campaign not found")

    rows = await fetch_all(
        """
        SELECT cp.wallet, cp.campaign_xp,
               p.display_name, p.github_handle, p.x_handle, p.track
        FROM campaign_participants cp
        JOIN participants p ON p.wallet = cp.wallet
        WHERE cp.campaign_id = $1 AND cp.campaign_xp > 0
        ORDER BY cp.campaign_xp DESC
        """,
        campaign_id,
    )

    total_xp = sum(r["campaign_xp"] for r in rows)
    pool_amount = Decimal(campaign["pool_amount"])
    minimum_payout = Decimal("1.0")

    payouts = []
    for i, row in enumerate(rows):
        xp_share = (row["campaign_xp"] / total_xp) if total_xp > 0 else Decimal("0")
        estimated_cc = xp_share * pool_amount
        below_minimum = estimated_cc < minimum_payout

        payouts.append(
            PayoutPreview(
                rank=i + 1,
                wallet=row["wallet"],
                display_name=row["display_name"] or row["github_handle"] or row["x_handle"] or row["wallet"],
                track=TrackType(row["track"]) if row["track"] else None,
                xp_earned=row["campaign_xp"],
                xp_share=xp_share,
                estimated_cc=estimated_cc,
                below_minimum=below_minimum,
            )
        )

    return CampaignPayoutPreview(
        campaign_id=campaign_id,
        title=campaign["title"],
        status=CampaignStatus(campaign["status"]),
        pool_amount=pool_amount,
        total_xp=total_xp,
        total_participants=len(rows),
        minimum_payout=minimum_payout,
        generated_at=datetime.utcnow(),
        payouts=payouts,
    )


def _row_to_campaign(row: dict[str, Any]) -> Campaign:
    return Campaign(
        id=UUID(row["id"]),
        creator_wallet=row["creator_wallet"],
        title=row["title"],
        description=row["description"],
        pool_amount=Decimal(row["pool_amount"]),
        pool_remaining=Decimal(row["pool_remaining"]),
        token=row["token"],
        status=CampaignStatus(row["status"]),
        track_type=TrackType(row["track_type"]),
        start_date=row["start_date"],
        end_date=row["end_date"],
        ended_at=row["ended_at"],
        funding_tx_hash=row["funding_tx_hash"],
        required_hashtags=row["required_hashtags"] or [],
        required_mentions=row["required_mentions"] or [],
        github_repo_url=row["github_repo_url"],
        github_issue_labels=row["github_issue_labels"] or [],
        max_oss_contributions=row["max_oss_contributions"],
        max_content_contributions=row["max_content_contributions"],
        score_threshold=row["score_threshold"],
        participant_count=int(row.get("participant_count", 0)),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _row_to_campaign_participant(row: dict[str, Any]) -> CampaignParticipant:
    return CampaignParticipant(
        id=UUID(row["id"]),
        campaign_id=UUID(row["campaign_id"]),
        wallet=row["wallet"],
        campaign_xp=row["campaign_xp"],
        enrolled_at=row["enrolled_at"],
    )
