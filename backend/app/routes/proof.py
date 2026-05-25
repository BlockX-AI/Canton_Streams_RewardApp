from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.services.proof_service import get_canton_proof_stats

router = APIRouter(prefix="/proof", tags=["proof"])


@router.get("/canton-stats")
async def canton_proof_stats() -> dict:
    """
    Canton DevNet proof-of-usage stats.
    Returns total parties, active users, recent allocations with Cantonscan + CCExplorer links.
    Public endpoint — safe to share with committees and grant reviewers.
    """
    if not settings.database_url:
        return {
            "validator": "GINIE-VALIDATOR",
            "network": "Canton DevNet",
            "package_id": settings.canton_package_id,
            "namespace": settings.canton_namespace,
            "stats": {
                "total_parties": 0,
                "active_7d": 0,
                "campaign_completions": 0,
                "total_xp_minted": 0,
            },
            "recent_parties": [],
            "note": "Database not connected — no live data available",
        }
    try:
        return await get_canton_proof_stats()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
