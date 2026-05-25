from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class CampaignStatus(str, Enum):
    DRAFT = "DRAFT"
    FUNDED = "FUNDED"
    ACTIVE = "ACTIVE"
    ENDED = "ENDED"
    SETTLING = "SETTLING"
    CLOSED = "CLOSED"


class TrackType(str, Enum):
    OSS = "OSS"
    CONTENT = "CONTENT"
    BOTH = "BOTH"


class Campaign(BaseModel):
    id: UUID
    creator_wallet: str
    title: str
    description: str | None = None
    pool_amount: Decimal
    pool_remaining: Decimal
    token: str = "CC"
    status: CampaignStatus
    track_type: TrackType = TrackType.BOTH
    start_date: datetime
    end_date: datetime
    ended_at: datetime | None = None
    funding_tx_hash: str | None = None
    required_hashtags: list[str] = []
    required_mentions: list[str] = []
    github_repo_url: str | None = None
    github_issue_labels: list[str] = []
    max_oss_contributions: int = 3
    max_content_contributions: int = 10
    score_threshold: int = 70
    participant_count: int = 0
    created_at: datetime
    updated_at: datetime


class CampaignCreate(BaseModel):
    creator_wallet: str
    title: str
    description: str | None = None
    pool_amount: Decimal
    token: str = "CC"
    track_type: TrackType = TrackType.BOTH
    start_date: datetime
    end_date: datetime
    required_hashtags: list[str] = []
    required_mentions: list[str] = []
    github_repo_url: str | None = None
    github_issue_labels: list[str] = []
    max_oss_contributions: int = 3
    max_content_contributions: int = 10
    score_threshold: int = 70


class CampaignFund(BaseModel):
    tx_hash: str | None = None


class CampaignParticipant(BaseModel):
    id: UUID
    campaign_id: UUID
    wallet: str
    campaign_xp: int = 0
    enrolled_at: datetime


class CampaignEnroll(BaseModel):
    wallet: str


class LeaderboardEntry(BaseModel):
    rank: int
    wallet: str
    display_name: str | None = None
    github_handle: str | None = None
    x_handle: str | None = None
    track: TrackType | None = None
    campaign_xp: int
    estimated_cc: Decimal


class CampaignLeaderboard(BaseModel):
    campaign_id: UUID
    title: str
    status: CampaignStatus
    pool_amount: Decimal
    total_xp: int
    total_participants: int
    page: int
    limit: int
    entries: list[LeaderboardEntry]


class PayoutPreview(BaseModel):
    rank: int
    wallet: str
    display_name: str | None = None
    track: TrackType | None = None
    xp_earned: int
    xp_share: Decimal
    estimated_cc: Decimal
    below_minimum: bool


class CampaignPayoutPreview(BaseModel):
    campaign_id: UUID
    title: str
    status: CampaignStatus
    pool_amount: Decimal
    total_xp: int
    total_participants: int
    minimum_payout: Decimal = Decimal("1.0")
    generated_at: datetime
    payouts: list[PayoutPreview]


class PayoutRecord(BaseModel):
    wallet: str
    display_name: str | None = None
    xp_share: Decimal
    cc_amount: Decimal
    status: str
    tx_hash: str | None = None
    error: str | None = None


class CampaignPayoutResult(BaseModel):
    campaign_id: UUID
    title: str
    pool_amount: Decimal
    total_distributed: Decimal
    total_participants: int
    successful: int
    failed: int
    skipped: int
    executed_at: datetime
    payouts: list[PayoutRecord]
