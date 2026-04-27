from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.dependencies import RequestId, get_vesting_service
from app.models.vesting import VestingView
from app.services.vesting_service import VestingService

router = APIRouter(prefix="/vesting", tags=["vesting"])


@router.get("", response_model=list[VestingView])
async def list_vesting(
    party: str = Query(..., description="Full Canton party ID"),
    svc: Annotated[VestingService, Depends(get_vesting_service)] = ...,
) -> list[VestingView]:
    return await svc.list_vesting(party)


@router.post("/{contract_id}/withdraw")
async def vesting_withdraw(
    contract_id: str,
    party: str = Query(..., description="Receiver party ID"),
    request_id: RequestId = ...,
    svc: Annotated[VestingService, Depends(get_vesting_service)] = ...,
) -> dict:
    result = await svc.withdraw(contract_id, party, request_id)
    return {"ok": True, "request_id": request_id, "result": result}
