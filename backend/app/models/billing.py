from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, field_validator


class BillingSessionView(BaseModel):
    contract_id: str
    stream_id: int
    client: str
    provider: str
    admin: str
    flow_rate: Decimal
    deposited: Decimal
    billed_total: Decimal
    status: str
    last_update: str | None = None
    billed_this_session_estimate: Decimal | None = None
    remaining: Decimal | None = None


class CreateBillingSessionRequest(BaseModel):
    client_party: str
    provider_party: str
    rate_per_second: Decimal
    initial_deposit: Decimal

    @field_validator("rate_per_second", "initial_deposit")
    @classmethod
    def positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Must be positive")
        return v
