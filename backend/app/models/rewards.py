from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel


class ActivityRecordView(BaseModel):
    contract_id: str
    provider: str
    activity_type: str
    activity_label: str
    reference_id: str
    timestamp: str


class RewardsSummaryView(BaseModel):
    total_activity_records: int
    activity_breakdown: dict[str, int]
    monthly_txn_estimate: int
    network_share_pct: Decimal
    estimated_monthly_cc: Decimal
    estimated_monthly_usd: Decimal
    cc_price_usd: Decimal
    monthly_rewards_pool_cc: Decimal
    featured_app_ready: bool
    notice: str = (
        "Projections assume Featured App status granted by Canton Tokenomics Committee. "
        "Stub FeaturedAppActivityRecord is used until splice-amulet.dar is available via DPM."
    )
