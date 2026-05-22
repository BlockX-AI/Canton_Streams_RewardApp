from __future__ import annotations

from fastapi import APIRouter, Query

from app.models.participants import Participant, ParticipantCreate, ParticipantStats, TrackType
from app.services.participant_service import get_or_create_participant, get_participant, get_participant_stats

router = APIRouter(prefix="/participants", tags=["participants"])

# Demo participant data
DEMO_PARTICIPANTS = {
    "0xalice...1234": {
        "wallet": "0xalice...1234",
        "display_name": "Alice Dev",
        "github_handle": "alicedev",
        "x_handle": "alicedev_canton",
        "track": "OSS",
        "total_xp": 15420,
        "rank": 1,
        "campaign_xp": 15420,
    },
    "0xbob...5678": {
        "wallet": "0xbob...5678",
        "display_name": "Bob Builder",
        "github_handle": "bobbuilder",
        "x_handle": None,
        "track": "OSS",
        "total_xp": 12350,
        "rank": 2,
        "campaign_xp": 12350,
    },
}


@router.post("", response_model=Participant, status_code=201)
async def create_participant_endpoint(data: ParticipantCreate) -> Participant:
    return await get_or_create_participant(data)


@router.get("/{wallet}", response_model=Participant)
async def get_participant_endpoint(wallet: str) -> Participant:
    from app.config import settings
    if not settings.database_url:
        demo = DEMO_PARTICIPANTS.get(wallet)
        if demo:
            return Participant(
                id=1,
                wallet=demo["wallet"],
                github_handle=demo["github_handle"],
                x_handle=demo["x_handle"],
                display_name=demo["display_name"],
                track=TrackType(demo["track"]),
                total_xp=demo["total_xp"],
                created_at=None,
                updated_at=None,
            )
        raise ValueError("Participant not found")
    participant = await get_participant(wallet)
    if not participant:
        raise ValueError("Participant not found")
    return participant


@router.get("/{wallet}/stats", response_model=ParticipantStats)
async def get_participant_stats_endpoint(wallet: str) -> ParticipantStats:
    from app.config import settings
    if not settings.database_url:
        demo = DEMO_PARTICIPANTS.get(wallet)
        if demo:
            return ParticipantStats(
                wallet=demo["wallet"],
                display_name=demo["display_name"],
                github_handle=demo["github_handle"],
                x_handle=demo["x_handle"],
                track=TrackType(demo["track"]),
                total_xp=demo["total_xp"],
                rank=demo["rank"],
                campaign_xp=demo["campaign_xp"],
            )
        # Return a demo response for any wallet
        return ParticipantStats(
            wallet=wallet,
            display_name=wallet[:12],
            github_handle=None,
            x_handle=None,
            track=TrackType.BOTH,
            total_xp=500,
            rank=50,
            campaign_xp=500,
        )
    return await get_participant_stats(wallet)
