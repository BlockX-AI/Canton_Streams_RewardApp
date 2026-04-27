from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, field_validator


class SubscriptionView(BaseModel):
    contract_id: str
    stream_id: int
    vendor: str
    customer: str
    admin: str
    rate_per_second: Decimal
    deposited: Decimal
    used: Decimal
    remaining: Decimal
    status: str
    coverage_days: float | None = None
    last_update: str | None = None


class CreateSubscriptionRequest(BaseModel):
    vendor_party: str
    customer_party: str
    rate_per_second: Decimal
    initial_deposit: Decimal

    @field_validator("rate_per_second", "initial_deposit")
    @classmethod
    def positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Must be positive")
        return v
