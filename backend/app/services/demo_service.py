"""
DemoService: queries real ACS and aggregates state for /demo endpoints.
Never fabricates data. All values come from Canton.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.clients.canton_client import CantonClient
from app.services.canton_query_service import CantonQueryService
from app.services.lp_pool_service import _build_pool_view
from app.services.milestone_service import _build_milestone_view
from app.services.stream_service import _build_stream_view
from app.services.vesting_service import _build_vesting_view
from app.utils.decimals import to_decimal
from app.utils.time import now_iso


class DemoService:
    def __init__(self, client: CantonClient, known_parties: dict[str, str]) -> None:
        self._qs = CantonQueryService(client)
        self._known_parties = known_parties
        self._party_names = {v: k for k, v in known_parties.items()}

    async def state(self) -> dict[str, Any]:
        admin_party = self._known_parties.get("Admin", "")
        alice_party = self._known_parties.get("Alice", "")

        all_contracts: list[Any] = []
        for pid in self._known_parties.values():
            try:
                contracts = await self._qs.all_contracts(pid)
                all_contracts.extend(contracts)
            except Exception:
                pass

        seen_cids: set[str] = set()
        unique: list[Any] = []
        for c in all_contracts:
            if c.contract_id not in seen_cids:
                seen_cids.add(c.contract_id)
                unique.append(c)

        streams = [_build_stream_view(c) for c in unique if c.template_name == "StreamAgreement"]
        pools = [_build_pool_view(c) for c in unique if c.template_name == "StreamPool"]
        vestings = [_build_vesting_view(c) for c in unique if c.template_name == "VestingStream"]
        milestones = [_build_milestone_view(c) for c in unique if c.template_name == "MilestoneStream"]

        token_balances: dict[str, Decimal] = {}
        for name, pid in self._known_parties.items():
            total = sum(
                to_decimal(c.payload.get("amount", "0"))
                for c in unique
                if c.template_name == "GrowToken" and str(c.payload.get("owner", "")) == pid
            )
            token_balances[name] = total

        return {
            "queried_at": now_iso(),
            "source": "canton_acs",
            "token_balances": {k: str(v) for k, v in token_balances.items()},
            "active_streams": len([s for s in streams if s.status == "Active"]),
            "paused_streams": len([s for s in streams if s.status == "Paused"]),
            "streams": [s.model_dump() for s in streams],
            "lp_pools": [pool.model_dump() for pool in pools],
            "vesting_schedules": [v.model_dump() for v in vestings],
            "billing_sessions": len([s for s in streams if s.status in ("Active", "Paused")]),
            "milestones": [m.model_dump() for m in milestones],
            "use_cases": {
                "uc1_payroll": len([s for s in streams if s.status == "Active"]) > 0,
                "uc2_lp_rewards": len(pools) > 0,
                "uc3_billing": len([s for s in streams if s.status == "Paused"]) > 0,
                "uc4_vesting": len(vestings) > 0,
                "uc5_saas": len(streams) > 0,
                "uc6_milestone": len(milestones) > 0,
            },
        }

    async def use_cases(self) -> list[dict[str, Any]]:
        return [
            {
                "id": "uc1",
                "name": "Payroll Streaming",
                "description": "Continuous per-second salary. Withdraw anytime. No batch processing.",
                "contracts": ["StreamCore:StreamAgreement"],
                "parties": ["Alice (sender)", "Bob (employee)"],
                "key_choices": ["Withdraw", "TopUp", "Pause", "Resume", "Stop"],
            },
            {
                "id": "uc2",
                "name": "LP Incentive Rewards",
                "description": "1-to-N proportional reward pool. Members withdraw independently.",
                "contracts": ["StreamPool:StreamPool"],
                "parties": ["Admin (pool admin)", "Alice (70%)", "Carol (30%)"],
                "key_choices": ["WithdrawMember", "TopUpPool", "PausePool", "ResumePool"],
            },
            {
                "id": "uc3",
                "name": "Institutional Billing",
                "description": "Per-second metered billing. Pause = session end, auto-settles accrued.",
                "contracts": ["StreamCore:StreamAgreement"],
                "parties": ["Alice (client)", "Carol (service provider)"],
                "key_choices": ["Pause", "Resume"],
            },
            {
                "id": "uc4",
                "name": "Token Vesting",
                "description": "Cliff + linear unlock. Canton enforces cliff on-chain. No frontend bypass.",
                "contracts": ["VestingStream:VestingStream"],
                "parties": ["Alice (company)", "Bob (employee)"],
                "key_choices": ["VestingWithdraw", "VestingStop"],
            },
            {
                "id": "uc5",
                "name": "B2B SaaS Subscription",
                "description": "Per-second subscription billing. Pause when idle. Exact receivable for vendor.",
                "contracts": ["StreamCore:StreamAgreement"],
                "parties": ["Alice (vendor)", "Bob (enterprise customer)"],
                "key_choices": ["Withdraw", "TopUp", "Pause", "Resume"],
            },
            {
                "id": "uc6",
                "name": "Milestone Escrow",
                "description": "DVP payment release by admin confirmation. Atomic GrowToken transfer.",
                "contracts": ["MilestoneStream:MilestoneStream"],
                "parties": ["Alice (client)", "Carol (contractor)", "Admin (oracle)"],
                "key_choices": ["ConfirmMilestone", "RefundRemaining", "ForceRefund"],
            },
        ]
