from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, field_validator


class StreamView(BaseModel):
    contract_id: str
    stream_id: int
    sender: str
    receiver: str
    admin: str
    flow_rate: Decimal
    deposited: Decimal
    withdrawn: Decimal
    status: str
    start_time: str | None = None
    last_update: str | None = None
    accrued_estimate: Decimal | None = None
    available: Decimal | None = None
    coverage_seconds: float | None = None


class CreatePayrollStreamRequest(BaseModel):
    sender_party: str
    receiver_party: str
    flow_rate: Decimal
    initial_deposit: Decimal

    @field_validator("flow_rate", "initial_deposit")
    @classmethod
    def positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Must be positive")
        return v


class WithdrawResponse(BaseModel):
    contract_id: str
    amount_estimate: Decimal | None = None
    tx_result: dict | None = None


class TopUpRequest(BaseModel):
    amount: Decimal

    @field_validator("amount")
    @classmethod
    def positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Must be positive")
        return v
