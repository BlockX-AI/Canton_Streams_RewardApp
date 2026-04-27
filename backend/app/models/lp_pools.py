from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, field_validator


class MemberStateView(BaseModel):
    party: str
    party_name: str
    units: Decimal
    withdrawn: Decimal
    share_percent: Decimal
    last_update: str | None = None
    accrued_estimate: Decimal | None = None


class LPPoolView(BaseModel):
    contract_id: str
    pool_id: int
    admin: str
    total_rate: Decimal
    deposited: Decimal
    total_withdrawn: Decimal
    available: Decimal
    status: str
    total_units: Decimal
    members: list[MemberStateView]


class CreateLPPoolRequest(BaseModel):
    members: list[tuple[str, Decimal]]
    total_rate: Decimal
    deposit: Decimal

    @field_validator("total_rate", "deposit")
    @classmethod
    def positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Must be positive")
        return v


class WithdrawShareRequest(BaseModel):
    member_party: str
