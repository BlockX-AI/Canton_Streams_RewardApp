from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.dependencies import RequestId, get_milestone_service
from app.models.milestones import ConfirmMilestoneRequest, MilestoneStreamView, ReleaseMilestoneRequest
from app.services.milestone_service import MilestoneService

router = APIRouter(prefix="/milestones", tags=["milestones"])


@router.get("", response_model=list[MilestoneStreamView])
async def list_milestones(
    party: str = Query(..., description="Full Canton party ID"),
    svc: Annotated[MilestoneService, Depends(get_milestone_service)] = ...,
) -> list[MilestoneStreamView]:
    return await svc.list_milestones(party)


@router.post("/{contract_id}/confirm")
async def confirm_milestone(
    contract_id: str,
    body: ConfirmMilestoneRequest,
    request_id: RequestId = ...,
    svc: Annotated[MilestoneService, Depends(get_milestone_service)] = ...,
) -> dict:
    result = await svc.confirm_milestone(
        contract_id, body.milestone_name, body.admin_party, request_id
    )
    return {"ok": True, "request_id": request_id, "result": result}


@router.post("/{contract_id}/release")
async def release_refund(
    contract_id: str,
    body: ReleaseMilestoneRequest,
    request_id: RequestId = ...,
    svc: Annotated[MilestoneService, Depends(get_milestone_service)] = ...,
) -> dict:
    result = await svc.release_refund(contract_id, body.sender_party, request_id)
    return {"ok": True, "request_id": request_id, "result": result}


@router.post("/{contract_id}/cancel")
async def force_cancel(
    contract_id: str,
    body: ConfirmMilestoneRequest,
    request_id: RequestId = ...,
    svc: Annotated[MilestoneService, Depends(get_milestone_service)] = ...,
) -> dict:
    result = await svc.force_cancel(contract_id, body.admin_party, request_id)
    return {"ok": True, "request_id": request_id, "result": result}
