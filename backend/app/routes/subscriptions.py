from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.dependencies import RequestId, get_stream_service
from app.models.subscriptions import SubscriptionView
from app.services.stream_service import StreamService
from app.utils.decimals import safe_subtract

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


def _to_subscription_view(sv) -> SubscriptionView:
    remaining = safe_subtract(sv.deposited, sv.withdrawn)
    coverage_days = None
    if sv.flow_rate > 0 and sv.status == "Active":
        coverage_days = float(remaining / sv.flow_rate / 86400)
    return SubscriptionView(
        contract_id=sv.contract_id,
        stream_id=sv.stream_id,
        vendor=sv.sender,
        customer=sv.receiver,
        admin=sv.admin,
        rate_per_second=sv.flow_rate,
        deposited=sv.deposited,
        used=sv.withdrawn,
        remaining=remaining,
        status=sv.status,
        coverage_days=coverage_days,
        last_update=sv.last_update,
    )


@router.get("", response_model=list[SubscriptionView])
async def list_subscriptions(
    party: str = Query(..., description="Full Canton party ID"),
    svc: Annotated[StreamService, Depends(get_stream_service)] = ...,
) -> list[SubscriptionView]:
    streams = await svc.list_streams(party)
    return [_to_subscription_view(s) for s in streams]


@router.post("/{contract_id}/pause")
async def pause_subscription(
    contract_id: str,
    party: str = Query(..., description="Sender (vendor) party ID"),
    request_id: RequestId = ...,
    svc: Annotated[StreamService, Depends(get_stream_service)] = ...,
) -> dict:
    result = await svc.pause(contract_id, party, request_id)
    return {"ok": True, "request_id": request_id, "result": result}


@router.post("/{contract_id}/resume")
async def resume_subscription(
    contract_id: str,
    party: str = Query(..., description="Sender (vendor) party ID"),
    request_id: RequestId = ...,
    svc: Annotated[StreamService, Depends(get_stream_service)] = ...,
) -> dict:
    result = await svc.resume(contract_id, party, request_id)
    return {"ok": True, "request_id": request_id, "result": result}


@router.post("/{contract_id}/withdraw")
async def withdraw_subscription(
    contract_id: str,
    party: str = Query(..., description="Receiver (customer) party ID"),
    request_id: RequestId = ...,
    svc: Annotated[StreamService, Depends(get_stream_service)] = ...,
) -> dict:
    result = await svc.withdraw(contract_id, party, request_id)
    return {"ok": True, "request_id": request_id, "result": result}
