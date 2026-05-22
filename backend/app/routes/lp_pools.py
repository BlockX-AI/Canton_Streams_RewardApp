from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.dependencies import RequestId, get_lp_pool_service
from app.models.lp_pools import AddMemberRequest, AdminPartyRequest, LPPoolView, WithdrawShareRequest
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


@router.post("/{contract_id}/pause")
async def pause_pool(
    contract_id: str,
    body: AdminPartyRequest,
    request_id: RequestId = ...,
    svc: Annotated[LPPoolService, Depends(get_lp_pool_service)] = ...,
) -> dict:
    result = await svc.pause(contract_id, body.admin_party, request_id)
    return {"ok": True, "request_id": request_id, "result": result}


@router.post("/{contract_id}/resume")
async def resume_pool(
    contract_id: str,
    body: AdminPartyRequest,
    request_id: RequestId = ...,
    svc: Annotated[LPPoolService, Depends(get_lp_pool_service)] = ...,
) -> dict:
    result = await svc.resume(contract_id, body.admin_party, request_id)
    return {"ok": True, "request_id": request_id, "result": result}


@router.post("/{contract_id}/add-member")
async def add_member(
    contract_id: str,
    body: AddMemberRequest,
    request_id: RequestId = ...,
    svc: Annotated[LPPoolService, Depends(get_lp_pool_service)] = ...,
) -> dict:
    result = await svc.add_member(contract_id, body.new_member, body.units, body.admin_party, request_id)
    return {"ok": True, "request_id": request_id, "result": result}
