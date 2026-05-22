from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.clients.canton_client import CantonClient
from app.config import settings
from app.dependencies import get_canton_client
from app.models.rewards import ActivityRecordView, RewardsSummaryView
from app.services.rewards_service import RewardsService

router = APIRouter(prefix="/rewards", tags=["rewards"])


def _get_rewards_service(
    client: Annotated[CantonClient, Depends(get_canton_client)],
) -> RewardsService:
    return RewardsService(client, settings.known_parties())


@router.get("/activity", response_model=list[ActivityRecordView])
async def list_activity(
    party: str = Query(..., description="Full Canton party ID to query as"),
    svc: Annotated[RewardsService, Depends(_get_rewards_service)] = ...,
) -> list[ActivityRecordView]:
    records = await svc.list_activity(party)
    return [
        ActivityRecordView(
            contract_id=r.contract_id,
            provider=r.provider,
            activity_type=r.activity_type,
            activity_label=r.activity_label,
            reference_id=r.reference_id,
            timestamp=r.timestamp,
        )
        for r in records
    ]


@router.get("/summary", response_model=RewardsSummaryView)
async def rewards_summary(
    party: str = Query(..., description="Full Canton party ID to query as"),
    monthly_txn_estimate: int = Query(
        0,
        ge=0,
        description=(
            "Override monthly transaction count for projection. "
            "Defaults to total activity records seen on ledger."
        ),
    ),
    svc: Annotated[RewardsService, Depends(_get_rewards_service)] = ...,
) -> RewardsSummaryView:
    s = await svc.summary(party, monthly_txn_estimate)
    return RewardsSummaryView(
        total_activity_records=s.total_activity_records,
        activity_breakdown=s.activity_breakdown,
        monthly_txn_estimate=s.monthly_txn_estimate,
        network_share_pct=s.network_share_pct,
        estimated_monthly_cc=s.estimated_monthly_cc,
        estimated_monthly_usd=s.estimated_monthly_usd,
        cc_price_usd=s.cc_price_usd,
        monthly_rewards_pool_cc=s.monthly_rewards_pool_cc,
        featured_app_ready=s.featured_app_ready,
    )
