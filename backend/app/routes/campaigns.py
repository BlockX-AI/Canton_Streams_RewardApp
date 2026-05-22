from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Query

from app.models.campaigns import (
    Campaign,
    CampaignCreate,
    CampaignEnroll,
    CampaignFund,
    CampaignLeaderboard,
    CampaignPayoutPreview,
    CampaignStatus,
    LeaderboardEntry,
    TrackType,
)
from app.services.campaign_service import (
    create_campaign,
    enroll_in_campaign,
    fund_campaign,
    get_active_campaigns,
    get_campaign,
    get_campaign_leaderboard,
    get_campaign_participants,
    get_campaign_payout_preview,
    list_campaigns,
)

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

# Demo data for testing without database
DEMO_CAMPAIGNS = [
    {
        "id": uuid4(),
        "creator_wallet": "0x1234...5678",
        "title": "Canton Developer Quest",
        "description": "Build Daml contracts and integrate Canton payment streams. Earn CC for every contribution.",
        "pool_amount": Decimal("10000.0"),
        "pool_remaining": Decimal("7500.0"),
        "token": "CC",
        "status": CampaignStatus.ACTIVE.value,
        "track_type": TrackType.OSS.value,
        "category": "OSS Development",
        "flow_rate": Decimal("414555.0"),
        "distributed": Decimal("1071687.0"),
        "start_date": datetime.utcnow() - timedelta(days=30),
        "end_date": datetime.utcnow() + timedelta(days=30),
        "ended_at": None,
        "funding_tx_hash": None,
        "required_hashtags": ["#Canton", "#Daml"],
        "required_mentions": ["@CantonNetwork"],
        "github_repo_url": "https://github.com/canton-network",
        "github_issue_labels": ["enhancement", "bug"],
        "max_oss_contributions": 5,
        "max_content_contributions": 10,
        "score_threshold": 70,
        "participant_count": 247,
        "created_at": datetime.utcnow() - timedelta(days=35),
        "updated_at": datetime.utcnow(),
    },
    {
        "id": uuid4(),
        "creator_wallet": "0xabcd...efgh",
        "title": "Content Creator Challenge",
        "description": "Write articles, create videos, and share about Canton. Top creators earn extra rewards.",
        "pool_amount": Decimal("5000.0"),
        "pool_remaining": Decimal("3200.0"),
        "token": "CC",
        "status": CampaignStatus.ACTIVE.value,
        "track_type": TrackType.CONTENT.value,
        "category": "Social",
        "flow_rate": Decimal("682475.0"),
        "distributed": Decimal("1767003.0"),
        "start_date": datetime.utcnow() - timedelta(days=15),
        "end_date": datetime.utcnow() + timedelta(days=45),
        "ended_at": None,
        "funding_tx_hash": None,
        "required_hashtags": ["#Canton", "#Blockchain"],
        "required_mentions": [],
        "github_repo_url": None,
        "github_issue_labels": [],
        "max_oss_contributions": 0,
        "max_content_contributions": 15,
        "score_threshold": 65,
        "participant_count": 89,
        "created_at": datetime.utcnow() - timedelta(days=20),
        "updated_at": datetime.utcnow(),
    },
    {
        "id": uuid4(),
        "creator_wallet": "0x9876...5432",
        "title": "Privacy Protocol Season 1",
        "description": "Contribute to privacy-focused features on Canton. Build the future of confidential DeFi.",
        "pool_amount": Decimal("25000.0"),
        "pool_remaining": Decimal("25000.0"),
        "token": "CC",
        "status": CampaignStatus.FUNDED.value,
        "track_type": TrackType.BOTH.value,
        "category": "DeFi",
        "flow_rate": Decimal("455187.0"),
        "distributed": Decimal("862930.0"),
        "start_date": datetime.utcnow() + timedelta(days=7),
        "end_date": datetime.utcnow() + timedelta(days=90),
        "ended_at": None,
        "funding_tx_hash": "0xabc123...",
        "required_hashtags": ["#Privacy", "#Canton"],
        "required_mentions": [],
        "github_repo_url": "https://github.com/canton-network/privacy",
        "github_issue_labels": ["privacy", "security"],
        "max_oss_contributions": 10,
        "max_content_contributions": 20,
        "score_threshold": 80,
        "participant_count": 0,
        "created_at": datetime.utcnow() - timedelta(days=5),
        "updated_at": datetime.utcnow(),
    },
    {
        "id": uuid4(),
        "creator_wallet": "0x1111...2222",
        "title": "CCTools Integration",
        "description": "Mint campaign NFTs or participate in discord to earn CC rewards.",
        "pool_amount": Decimal("15000.0"),
        "pool_remaining": Decimal("12000.0"),
        "token": "CC",
        "status": CampaignStatus.ACTIVE.value,
        "track_type": TrackType.BOTH.value,
        "category": "Social",
        "flow_rate": Decimal("917030.0"),
        "distributed": Decimal("1109311.0"),
        "start_date": datetime.utcnow() - timedelta(days=10),
        "end_date": datetime.utcnow() + timedelta(days=60),
        "ended_at": None,
        "funding_tx_hash": None,
        "required_hashtags": ["#CCTools", "#Canton"],
        "required_mentions": [],
        "github_repo_url": None,
        "github_issue_labels": [],
        "max_oss_contributions": 5,
        "max_content_contributions": 20,
        "score_threshold": 70,
        "participant_count": 156,
        "created_at": datetime.utcnow() - timedelta(days=15),
        "updated_at": datetime.utcnow(),
    },
    {
        "id": uuid4(),
        "creator_wallet": "0x3333...4444",
        "title": "DeFi Builder Grants",
        "description": "Fund builders through eligible streaming funding rounds for DeFi projects.",
        "pool_amount": Decimal("20000.0"),
        "pool_remaining": Decimal("18000.0"),
        "token": "CC",
        "status": CampaignStatus.ACTIVE.value,
        "track_type": TrackType.OSS.value,
        "category": "Grants",
        "flow_rate": Decimal("501704.0"),
        "distributed": Decimal("1296980.0"),
        "start_date": datetime.utcnow() - timedelta(days=5),
        "end_date": datetime.utcnow() + timedelta(days=75),
        "ended_at": None,
        "funding_tx_hash": None,
        "required_hashtags": ["#DeFi", "#Canton"],
        "required_mentions": [],
        "github_repo_url": "https://github.com/canton-network/defi",
        "github_issue_labels": ["defi", "grants"],
        "max_oss_contributions": 10,
        "max_content_contributions": 5,
        "score_threshold": 75,
        "participant_count": 203,
        "created_at": datetime.utcnow() - timedelta(days=10),
        "updated_at": datetime.utcnow(),
    },
]

DEMO_LEADERBOARD = [
    LeaderboardEntry(
        rank=1,
        wallet="0xalice...1234",
        display_name="Alice Dev",
        github_handle="alicedev",
        x_handle="alicedev_canton",
        track=TrackType.OSS,
        campaign_xp=15420,
        estimated_cc=Decimal("3855.00"),
    ),
    LeaderboardEntry(
        rank=2,
        wallet="0xbob...5678",
        display_name="Bob Builder",
        github_handle="bobbuilder",
        x_handle=None,
        track=TrackType.OSS,
        campaign_xp=12350,
        estimated_cc=Decimal("3087.50"),
    ),
    LeaderboardEntry(
        rank=3,
        wallet="0xcharlie...90ab",
        display_name="Charlie Creator",
        github_handle=None,
        x_handle="charlie_tech",
        track=TrackType.CONTENT,
        campaign_xp=9870,
        estimated_cc=Decimal("2467.50"),
    ),
    LeaderboardEntry(
        rank=4,
        wallet="0xdiana...cdef",
        display_name="Diana Daml",
        github_handle="dianadaml",
        x_handle="diana_daml",
        track=TrackType.OSS,
        campaign_xp=8540,
        estimated_cc=Decimal("2135.00"),
    ),
    LeaderboardEntry(
        rank=5,
        wallet="0xevan...0123",
        display_name="Evan Engineer",
        github_handle="evaneng",
        x_handle=None,
        track=TrackType.BOTH,
        campaign_xp=7200,
        estimated_cc=Decimal("1800.00"),
    ),
]


@router.post("", response_model=Campaign, status_code=201)
async def create_campaign_endpoint(data: CampaignCreate) -> Campaign:
    return await create_campaign(data)


@router.get("", response_model=dict)
async def list_campaigns_endpoint(
    status: str | None = Query(None),
    track_type: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    # Return demo data if no database configured
    from app.config import settings
    if not settings.database_url:
        filtered = DEMO_CAMPAIGNS
        if status:
            filtered = [c for c in filtered if c["status"] == status]
        if track_type:
            filtered = [c for c in filtered if c["track_type"] == track_type]
        return {
            "campaigns": [Campaign(**c) for c in filtered],
            "total": len(filtered),
            "page": page,
            "limit": limit,
        }
    return await list_campaigns(status, track_type, page, limit)


@router.get("/active", response_model=list[Campaign])
async def get_active_campaigns_endpoint() -> list[Campaign]:
    from app.config import settings
    if not settings.database_url:
        return [Campaign(**c) for c in DEMO_CAMPAIGNS if c["status"] == CampaignStatus.ACTIVE.value]
    return await get_active_campaigns()


@router.get("/{campaign_id}", response_model=Campaign)
async def get_campaign_endpoint(campaign_id: UUID) -> Campaign:
    from app.config import settings
    if not settings.database_url:
        for campaign in DEMO_CAMPAIGNS:
            if str(campaign["id"]) == str(campaign_id):
                return Campaign(**campaign)
        raise ValueError("Campaign not found")
    return await get_campaign(campaign_id)


@router.post("/{campaign_id}/fund", response_model=Campaign)
async def fund_campaign_endpoint(campaign_id: UUID, wallet: str = Query(...), data: CampaignFund = ...) -> Campaign:
    return await fund_campaign(campaign_id, wallet, data)


@router.post("/{campaign_id}/enroll", status_code=201)
async def enroll_campaign_endpoint(campaign_id: UUID, data: CampaignEnroll) -> dict:
    participant = await enroll_in_campaign(campaign_id, data)
    return {"ok": True, "participant": participant}


@router.get("/{campaign_id}/participants")
async def get_campaign_participants_endpoint(
    campaign_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    return await get_campaign_participants(campaign_id, page, limit)


@router.get("/{campaign_id}/leaderboard", response_model=CampaignLeaderboard)
async def get_campaign_leaderboard_endpoint(
    campaign_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
) -> CampaignLeaderboard:
    from app.config import settings
    if not settings.database_url:
        for campaign in DEMO_CAMPAIGNS:
            if str(campaign["id"]) == str(campaign_id):
                return CampaignLeaderboard(
                    campaign_id=campaign["id"],
                    title=campaign["title"],
                    status=CampaignStatus(campaign["status"]),
                    pool_amount=campaign["pool_amount"],
                    total_xp=sum(e.campaign_xp for e in DEMO_LEADERBOARD),
                    total_participants=len(DEMO_LEADERBOARD),
                    page=page,
                    limit=limit,
                    entries=DEMO_LEADERBOARD,
                )
        raise ValueError("Campaign not found")
    return await get_campaign_leaderboard(campaign_id, page, limit)


@router.get("/{campaign_id}/payout-preview", response_model=CampaignPayoutPreview)
async def get_payout_preview_endpoint(campaign_id: UUID) -> CampaignPayoutPreview:
    from app.config import settings
    if not settings.database_url:
        for campaign in DEMO_CAMPAIGNS:
            if str(campaign["id"]) == str(campaign_id):
                from app.models.campaigns import PayoutPreview
                total_xp = sum(e.campaign_xp for e in DEMO_LEADERBOARD)
                pool_amount = campaign["pool_amount"]
                payouts = []
                for i, entry in enumerate(DEMO_LEADERBOARD):
                    xp_share = (entry.campaign_xp / total_xp) if total_xp > 0 else Decimal("0")
                    estimated_cc = xp_share * pool_amount
                    payouts.append(
                        PayoutPreview(
                            rank=i + 1,
                            wallet=entry.wallet,
                            display_name=entry.display_name,
                            track=entry.track,
                            xp_earned=entry.campaign_xp,
                            xp_share=xp_share,
                            estimated_cc=estimated_cc,
                            below_minimum=estimated_cc < Decimal("1.0"),
                        )
                    )
                return CampaignPayoutPreview(
                    campaign_id=campaign["id"],
                    title=campaign["title"],
                    status=CampaignStatus(campaign["status"]),
                    pool_amount=pool_amount,
                    total_xp=total_xp,
                    total_participants=len(DEMO_LEADERBOARD),
                    minimum_payout=Decimal("1.0"),
                    generated_at=datetime.utcnow(),
                    payouts=payouts,
                )
        raise ValueError("Campaign not found")
    return await get_campaign_payout_preview(campaign_id)
