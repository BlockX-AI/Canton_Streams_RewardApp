from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, field_validator


class VestingView(BaseModel):
    contract_id: str
    vesting_id: int
    sender: str
    receiver: str
    admin: str
    cliff_time: str
    vesting_end: str
    total_amount: Decimal
    withdrawn: Decimal
    cliff_reached: bool
    vested_fraction: Decimal
    claimable_estimate: Decimal


class CreateVestingRequest(BaseModel):
    sender_party: str
    receiver_party: str
    cliff_time: str
    vesting_end: str
    total_amount: Decimal

    @field_validator("total_amount")
    @classmethod
    def positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Must be positive")
        return v
