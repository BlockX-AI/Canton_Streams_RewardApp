from __future__ import annotations

import logging
from datetime import datetime, timezone

from app.config import settings
from app.db import fetch_all, fetch_val

log = logging.getLogger(__name__)

CANTONSCAN_BASE = "https://scan.sv-2.dev.global.canton.network.digitalasset.com/parties"


def _short_id(full_party_id: str) -> str:
    """Extract short hash from party_id like 'hint::1220f42c...c986' → '1220f42c...c986'"""
    parts = full_party_id.split("::")
    hash_part = parts[-1] if len(parts) > 1 else full_party_id
    if len(hash_part) > 12:
        return f"{hash_part[:8]}...{hash_part[-4:]}"
    return hash_part


def _cantonscan_url(full_party_id: str) -> str:
    encoded = full_party_id.replace("::", "%3A%3A")
    return f"{CANTONSCAN_BASE}/{encoded}"


def _ccexplorer_url(full_party_id: str) -> str:
    encoded = full_party_id.replace("::", "%3A%3A")
    return f"https://devnet.ccexplorer.io/parties/{encoded}"


def _time_ago(dt: datetime) -> str:
    if dt is None:
        return "unknown"
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = now - dt
    seconds = int(diff.total_seconds())
    if seconds < 60:
        return f"{seconds}s ago"
    if seconds < 3600:
        return f"{seconds // 60}m ago"
    if seconds < 86400:
        return f"{seconds // 3600}h ago"
    return f"{seconds // 86400}d ago"


async def get_canton_proof_stats() -> dict:
    """
    Aggregate Canton DevNet proof stats from DB.
    Returns total parties, active users, recent allocations with Cantonscan links.
    """
    try:
        total_parties = await fetch_val(
            "SELECT COUNT(*) FROM participants WHERE wallet IS NOT NULL AND wallet != ''"
        ) or 0
    except Exception as exc:
        log.warning("proof_service: total_parties query failed: %s", exc)
        total_parties = 0

    try:
        active_7d = await fetch_val(
            """
            SELECT COUNT(DISTINCT wallet) FROM xp_events
            WHERE created_at > NOW() - INTERVAL '7 days'
            """
        ) or 0
    except Exception as exc:
        log.warning("proof_service: active_7d query failed: %s", exc)
        active_7d = 0

    try:
        campaign_completions = await fetch_val(
            "SELECT COUNT(*) FROM xp_events WHERE event_type = 'CAMPAIGN_COMPLETE'"
        ) or 0
    except Exception as exc:
        log.warning("proof_service: campaign_completions query failed: %s", exc)
        campaign_completions = 0

    try:
        total_xp = await fetch_val(
            "SELECT COALESCE(SUM(total_xp), 0) FROM participants"
        ) or 0
    except Exception as exc:
        log.warning("proof_service: total_xp query failed: %s", exc)
        total_xp = 0

    try:
        recent_rows = await fetch_all(
            """
            SELECT wallet, x_handle, display_name, total_xp, created_at
            FROM participants
            WHERE wallet IS NOT NULL AND wallet != ''
            ORDER BY created_at DESC
            LIMIT 20
            """
        )
    except Exception as exc:
        log.warning("proof_service: recent_rows query failed: %s", exc)
        recent_rows = []

    recent_parties = [
        {
            "short_id": _short_id(r["wallet"]),
            "full_id": r["wallet"],
            "x_handle": r["x_handle"] or "—",
            "display_name": r["display_name"] or "—",
            "total_xp": r["total_xp"] or 0,
            "cantonscan_url": _cantonscan_url(r["wallet"]),
            "ccexplorer_url": _ccexplorer_url(r["wallet"]),
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "time_ago": _time_ago(r["created_at"]),
        }
        for r in recent_rows
    ]

    return {
        "validator": "GINIE-VALIDATOR",
        "network": "Canton DevNet",
        "package_id": settings.canton_package_id,
        "namespace": settings.canton_namespace,
        "stats": {
            "total_parties": int(total_parties),
            "active_7d": int(active_7d),
            "campaign_completions": int(campaign_completions),
            "total_xp_minted": int(total_xp),
        },
        "recent_parties": recent_parties,
        "cantonscan_base": CANTONSCAN_BASE,
        "ccexplorer_base": "https://devnet.ccexplorer.io/parties",
    }
