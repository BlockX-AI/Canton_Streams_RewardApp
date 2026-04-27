from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.dependencies import RequestId, get_stream_service
from app.models.streams import StreamView, TopUpRequest, WithdrawResponse
from app.services.stream_service import StreamService

router = APIRouter(prefix="/streams", tags=["streams"])


@router.get("", response_model=list[StreamView])
async def list_streams(
    party: str = Query(..., description="Full Canton party ID"),
    svc: Annotated[StreamService, Depends(get_stream_service)] = ...,
) -> list[StreamView]:
    return await svc.list_streams(party)


@router.get("/{contract_id}", response_model=StreamView)
async def get_stream(
    contract_id: str,
    party: str = Query(..., description="Full Canton party ID"),
    svc: Annotated[StreamService, Depends(get_stream_service)] = ...,
) -> StreamView:
    return await svc.get_stream(party, contract_id)


@router.post("/{contract_id}/withdraw", response_model=WithdrawResponse)
async def withdraw(
    contract_id: str,
    party: str = Query(..., description="Receiver party ID"),
    request_id: RequestId = ...,
    svc: Annotated[StreamService, Depends(get_stream_service)] = ...,
) -> WithdrawResponse:
    return await svc.withdraw(contract_id, party, request_id)


@router.post("/{contract_id}/pause")
async def pause_stream(
    contract_id: str,
    party: str = Query(..., description="Sender party ID"),
    request_id: RequestId = ...,
    svc: Annotated[StreamService, Depends(get_stream_service)] = ...,
) -> dict:
    result = await svc.pause(contract_id, party, request_id)
    return {"ok": True, "request_id": request_id, "result": result}


@router.post("/{contract_id}/resume")
async def resume_stream(
    contract_id: str,
    party: str = Query(..., description="Sender party ID"),
    request_id: RequestId = ...,
    svc: Annotated[StreamService, Depends(get_stream_service)] = ...,
) -> dict:
    result = await svc.resume(contract_id, party, request_id)
    return {"ok": True, "request_id": request_id, "result": result}


@router.post("/{contract_id}/cancel")
async def stop_stream(
    contract_id: str,
    party: str = Query(..., description="Sender party ID"),
    request_id: RequestId = ...,
    svc: Annotated[StreamService, Depends(get_stream_service)] = ...,
) -> dict:
    result = await svc.stop(contract_id, party, request_id)
    return {"ok": True, "request_id": request_id, "result": result}


@router.post("/{contract_id}/top-up")
async def top_up_stream(
    contract_id: str,
    body: TopUpRequest,
    party: str = Query(..., description="Sender party ID"),
    request_id: RequestId = ...,
    svc: Annotated[StreamService, Depends(get_stream_service)] = ...,
) -> dict:
    result = await svc.top_up(contract_id, body.amount, party, request_id)
    return {"ok": True, "request_id": request_id, "result": result}
