from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.dependencies import RequestId, get_billing_service
from app.models.billing import BillingSessionView
from app.services.billing_service import BillingService

router = APIRouter(prefix="/billing/sessions", tags=["billing"])


@router.get("", response_model=list[BillingSessionView])
async def list_sessions(
    party: str = Query(..., description="Full Canton party ID"),
    svc: Annotated[BillingService, Depends(get_billing_service)] = ...,
) -> list[BillingSessionView]:
    return await svc.list_sessions(party)


@router.post("/{contract_id}/pause")
async def pause_session(
    contract_id: str,
    party: str = Query(..., description="Sender (client) party ID"),
    request_id: RequestId = ...,
    svc: Annotated[BillingService, Depends(get_billing_service)] = ...,
) -> dict:
    result = await svc.pause_session(contract_id, party, request_id)
    return {"ok": True, "request_id": request_id, "result": result}


@router.post("/{contract_id}/resume")
async def resume_session(
    contract_id: str,
    party: str = Query(..., description="Sender (client) party ID"),
    request_id: RequestId = ...,
    svc: Annotated[BillingService, Depends(get_billing_service)] = ...,
) -> dict:
    result = await svc.resume_session(contract_id, party, request_id)
    return {"ok": True, "request_id": request_id, "result": result}
