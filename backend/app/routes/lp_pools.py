from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.dependencies import RequestId, get_lp_pool_service
from app.models.lp_pools import LPPoolView, WithdrawShareRequest
from app.services.lp_pool_service import LPPoolService

router = APIRouter(prefix="/lp-pools", tags=["lp-pools"])


@router.get("", response_model=list[LPPoolView])
async def list_pools(
    party: str = Query(..., description="Full Canton party ID"),
    svc: Annotated[LPPoolService, Depends(get_lp_pool_service)] = ...,
) -> list[LPPoolView]:
    return await svc.list_pools(party)


@router.post("/{contract_id}/withdraw-share")
async def withdraw_share(
    contract_id: str,
    body: WithdrawShareRequest,
    request_id: RequestId = ...,
    svc: Annotated[LPPoolService, Depends(get_lp_pool_service)] = ...,
) -> dict:
    result = await svc.withdraw_share(contract_id, body.member_party, request_id)
    return {"ok": True, "request_id": request_id, "result": result}
