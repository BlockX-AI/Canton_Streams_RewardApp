from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.clients.canton_client import CantonClient
from app.config import settings
from app.dependencies import RequestId, get_canton_client
from app.models.canton import AllocatePartyRequest, PartyDetails, PartyListResponse

router = APIRouter(prefix="/parties", tags=["parties"])


@router.get("", response_model=PartyListResponse)
async def list_parties(
    client: Annotated[CantonClient, Depends(get_canton_client)],
) -> PartyListResponse:
    raw = await client.list_parties()
    parties = [
        PartyDetails(
            party_id=p.get("party") or p.get("partyId") or str(p),
            display_name=p.get("displayName") or p.get("display_name"),
            is_local=p.get("isLocal"),
        )
        for p in raw
    ]
    return PartyListResponse(parties=parties)


@router.post("/allocate")
async def allocate_party(
    body: AllocatePartyRequest,
    client: Annotated[CantonClient, Depends(get_canton_client)],
    request_id: RequestId,
) -> dict:
    if not settings.enable_admin_endpoints:
        raise HTTPException(status_code=403, detail="Admin endpoints are disabled")
    result = await client.allocate_party(body.display_name, body.party_id_hint)
    return {"ok": True, "request_id": request_id, "party": result}
