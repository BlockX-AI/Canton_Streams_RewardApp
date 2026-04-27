from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.dependencies import RequestId, get_token_service
from app.models.tokens import BalancesResponse, TokenBalance
from app.services.token_service import TokenService

router = APIRouter(prefix="/tokens", tags=["tokens"])


@router.get("", response_model=list[TokenBalance])
async def list_tokens(
    party: str = Query(..., description="Full Canton party ID"),
    svc: Annotated[TokenService, Depends(get_token_service)] = ...,
) -> list[TokenBalance]:
    return await svc.list_tokens(party)


@router.get("/balances", response_model=BalancesResponse)
async def all_balances(
    svc: Annotated[TokenService, Depends(get_token_service)] = ...,
) -> BalancesResponse:
    return await svc.all_balances()
