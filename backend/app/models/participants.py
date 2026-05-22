from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class TrackType(str, Enum):
    OSS = "OSS"
    CONTENT = "CONTENT"
    BOTH = "BOTH"


class Participant(BaseModel):
    id: int
    wallet: str
    github_handle: str | None = None
    x_handle: str | None = None
    display_name: str | None = None
    track: TrackType = TrackType.BOTH
    total_xp: int = 0
    created_at: datetime
    updated_at: datetime


class ParticipantCreate(BaseModel):
    wallet: str
    github_handle: str | None = None
    x_handle: str | None = None
    display_name: str | None = None
    track: TrackType = TrackType.BOTH


class ParticipantStats(BaseModel):
    wallet: str
    display_name: str | None = None
    github_handle: str | None = None
    x_handle: str | None = None
    track: TrackType
    total_xp: int
    rank: int | None = None
    campaign_xp: int | None = None
