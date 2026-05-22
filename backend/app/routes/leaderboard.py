from __future__ import annotations

from decimal import Decimal
from fastapi import APIRouter, Query

from app.models.xp import LeaderboardStats
from app.services.xp_service import get_leaderboard, get_leaderboard_stats

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])

# Demo leaderboard data
DEMO_GLOBAL_LEADERBOARD = [
    {
        "rank": 1,
        "wallet": "0xalice...1234",
        "display_name": "Alice Dev",
        "github_handle": "alicedev",
        "x_handle": "alicedev_canton",
        "track": "OSS",
        "total_xp": 15420,
    },
    {
        "rank": 2,
        "wallet": "0xbob...5678",
        "display_name": "Bob Builder",
        "github_handle": "bobbuilder",
        "x_handle": None,
        "track": "OSS",
        "total_xp": 12350,
    },
    {
        "rank": 3,
        "wallet": "0xcharlie...90ab",
        "display_name": "Charlie Creator",
        "github_handle": None,
        "x_handle": "charlie_tech",
        "track": "CONTENT",
        "total_xp": 9870,
    },
    {
        "rank": 4,
        "wallet": "0xdiana...cdef",
        "display_name": "Diana Daml",
        "github_handle": "dianadaml",
        "x_handle": "diana_daml",
        "track": "OSS",
        "total_xp": 8540,
    },
    {
        "rank": 5,
        "wallet": "0xevan...0123",
        "display_name": "Evan Engineer",
        "github_handle": "evaneng",
        "x_handle": None,
        "track": "BOTH",
        "total_xp": 7200,
    },
]


@router.get("")
async def get_leaderboard_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    track: str | None = Query(None),
) -> dict:
    from app.config import settings
    if not settings.database_url:
        filtered = DEMO_GLOBAL_LEADERBOARD
        if track:
            filtered = [e for e in filtered if e["track"] == track]
        return {
            "entries": filtered,
            "total": len(filtered),
            "page": page,
            "limit": limit,
        }
    return await get_leaderboard(page, limit, track)


@router.get("/stats")
async def get_leaderboard_stats_endpoint() -> LeaderboardStats:
    from app.config import settings
    if not settings.database_url:
        return LeaderboardStats(
            total_participants=336,
            total_xp=53380,
            total_contributions=1247,
            oss_contributions=892,
            content_contributions=355,
            top_contributor={
                "wallet": "0xalice...1234",
                "display_name": "Alice Dev",
                "total_xp": 15420,
                "track": "OSS",
            },
            campaign_days_remaining=30,
            pool_cc=40000.0,
        )
    return await get_leaderboard_stats()
