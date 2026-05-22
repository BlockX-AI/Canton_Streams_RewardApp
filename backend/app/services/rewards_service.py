"""
RewardsService: query FeaturedAppActivityRecord contracts and compute
CC revenue projections based on the CIP-0047 Featured App model.

All CC projections are estimates.  Actual rewards require Featured App
status granted by the Canton Tokenomics Committee.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from app.clients.canton_client import CantonClient
from app.services.canton_query_service import CantonQueryService

MONTHLY_REWARDS_POOL_CC = Decimal("516_000_000")
ESTIMATED_NETWORK_TXN_PER_MONTH = Decimal("40_000_000")
CC_PRICE_USD = Decimal("0.1546")

ACTIVITY_TYPE_LABELS: dict[str, str] = {
    "stream_created":       "Stream Created",
    "stream_withdraw":      "Stream Withdraw",
    "stream_stop_final":    "Stream Stop (final accrual)",
    "pause_settle":         "Stream Pause Settlement",
    "rate_update_settle":   "Rate Update Settlement",
    "pool_withdraw":        "Pool Member Withdraw",
    "pool_pause_settle":    "Pool Pause Settlement",
    "vesting_withdraw":     "Vesting Withdraw",
    "vesting_stop":         "Vesting Stop Refund",
    "milestone_confirm":    "Milestone Confirmed",
    "milestone_refund":     "Milestone Refund",
    "milestone_force_refund": "Milestone Force Refund",
}


@dataclass
class ActivityRecord:
    contract_id: str
    provider: str
    activity_type: str
    activity_label: str
    reference_id: str
    timestamp: str


@dataclass
class RewardsSummary:
    total_activity_records: int
    activity_breakdown: dict[str, int]
    monthly_txn_estimate: int
    network_share_pct: Decimal
    estimated_monthly_cc: Decimal
    estimated_monthly_usd: Decimal
    cc_price_usd: Decimal
    monthly_rewards_pool_cc: Decimal
    featured_app_ready: bool


class RewardsService:
    def __init__(self, client: CantonClient, known_parties: dict[str, str]) -> None:
        self._qs = CantonQueryService(client)
        self._known_parties = known_parties

    def _admin_party_id(self) -> str | None:
        return self._known_parties.get("Admin")

    async def list_activity(self, party_id: str) -> list[ActivityRecord]:
        contracts = await self._qs.contracts_by_template(party_id, "FeaturedAppActivityRecord")
        records: list[ActivityRecord] = []
        for c in contracts:
            p = c.payload
            atype = str(p.get("activityType", ""))
            records.append(ActivityRecord(
                contract_id=c.contract_id,
                provider=str(p.get("provider", "")),
                activity_type=atype,
                activity_label=ACTIVITY_TYPE_LABELS.get(atype, atype),
                reference_id=str(p.get("referenceId", "")),
                timestamp=str(p.get("timestamp", "")),
            ))
        records.sort(key=lambda r: r.timestamp, reverse=True)
        return records

    async def summary(self, party_id: str, monthly_txn_estimate: int = 0) -> RewardsSummary:
        records = await self.list_activity(party_id)
        total = len(records)

        breakdown: dict[str, int] = {}
        for r in records:
            breakdown[r.activity_type] = breakdown.get(r.activity_type, 0) + 1

        txns = monthly_txn_estimate if monthly_txn_estimate > 0 else total
        share = Decimal(str(txns)) / ESTIMATED_NETWORK_TXN_PER_MONTH if txns > 0 else Decimal("0")
        monthly_cc = MONTHLY_REWARDS_POOL_CC * share
        monthly_usd = monthly_cc * CC_PRICE_USD

        return RewardsSummary(
            total_activity_records=total,
            activity_breakdown=breakdown,
            monthly_txn_estimate=txns,
            network_share_pct=share * Decimal("100"),
            estimated_monthly_cc=monthly_cc.quantize(Decimal("0.01")),
            estimated_monthly_usd=monthly_usd.quantize(Decimal("0.01")),
            cc_price_usd=CC_PRICE_USD,
            monthly_rewards_pool_cc=MONTHLY_REWARDS_POOL_CC,
            featured_app_ready=False,
        )
