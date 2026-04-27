from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, field_validator


class MilestoneItem(BaseModel):
    name: str
    amount: Decimal
    done: bool


class MilestoneStreamView(BaseModel):
    contract_id: str
    milestone_id: int
    sender: str
    receiver: str
    admin: str
    milestones: list[MilestoneItem]
    deposited: Decimal
    pending_count: int
    confirmed_count: int
    total_pending_amount: Decimal


class CreateMilestoneRequest(BaseModel):
    sender_party: str
    receiver_party: str
    milestones: list[MilestoneItem]
    deposited: Decimal

    @field_validator("deposited")
    @classmethod
    def positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Must be positive")
        return v


class ConfirmMilestoneRequest(BaseModel):
    milestone_name: str
    admin_party: str


class ReleaseMilestoneRequest(BaseModel):
    sender_party: str
