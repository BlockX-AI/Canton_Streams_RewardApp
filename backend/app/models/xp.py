from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class XPEvent(BaseModel):
    id: int
    wallet: str
    xp_delta: int
    reason: str
    contribution_id: int | None = None
    campaign_id: UUID | None = None
    created_at: datetime


class XPAward(BaseModel):
    wallet: str
    xp_delta: int
    reason: str
    contribution_id: int | None = None
    campaign_id: UUID | None = None


class LeaderboardStats(BaseModel):
    total_participants: int
    total_xp: int
    total_contributions: int
    oss_contributions: int
    content_contributions: int
    top_contributor: dict[str, Any] | None = None
    campaign_days_remaining: int | None = None
    pool_cc: float
