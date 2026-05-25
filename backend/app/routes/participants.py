from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.dependencies import get_canton_client
from app.clients.canton_client import CantonClient
from app.models.participants import Participant, ParticipantCreate, ParticipantStats, TrackType
from app.services.participant_service import (
    get_or_create_participant,
    get_or_create_participant_with_party,
    get_participant,
    get_participant_stats,
    list_participants,
)


class RegisterWithParty(BaseModel):
    x_handle: str
    display_name: str
    github_handle: str | None = None
    track: TrackType = TrackType.BOTH

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


@router.get("", response_model=list[Participant])
async def list_participants_endpoint(
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[Participant]:
    """List all registered Canton participants with their party IDs."""
    from app.config import settings
    if not settings.database_url:
        return [
            Participant(
                id=1, wallet="alice::1220f42cead6c3bf0443af1f0e51ee250afb48ee528756945ee2733cbfef62c10986",
                github_handle="alicedev", x_handle="@alicedev", display_name="Alice Dev",
                track=TrackType.OSS, total_xp=1500, created_at=None, updated_at=None,
            ),
            Participant(
                id=2, wallet="bobbuilder::1220f42cead6c3bf0443af1f0e51ee250afb48ee528756945ee2733cbfef62c10986",
                github_handle="bobbuilder", x_handle="@bobbuilder", display_name="Bob Builder",
                track=TrackType.OSS, total_xp=1200, created_at=None, updated_at=None,
            ),
        ]
    return await list_participants(limit=limit)


@router.post("", response_model=Participant, status_code=201)
async def create_participant_endpoint(data: ParticipantCreate) -> Participant:
    return await get_or_create_participant(data)


@router.post("/register", response_model=Participant)
async def register_with_party_endpoint(
    data: RegisterWithParty,
    canton_client: Annotated[CantonClient, Depends(get_canton_client)],
) -> Participant:
    """Register a new participant and auto-allocate a Canton party ID via GINIE-VALIDATOR."""
    from fastapi import HTTPException
    try:
        return await get_or_create_participant_with_party(
            x_handle=data.x_handle,
            display_name=data.display_name,
            canton_client=canton_client,
            github_handle=data.github_handle,
            track=data.track,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


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
