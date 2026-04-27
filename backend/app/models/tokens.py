from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel


class TokenBalance(BaseModel):
    contract_id: str
    owner: str
    issuer: str
    amount: Decimal
    symbol: str


class PartyBalance(BaseModel):
    party_id: str
    party_name: str
    total_grow: Decimal
    token_count: int


class BalancesResponse(BaseModel):
    balances: list[PartyBalance]
