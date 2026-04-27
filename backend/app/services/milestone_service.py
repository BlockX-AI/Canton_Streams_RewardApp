from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.clients.canton_client import CantonClient
from app.models.milestones import MilestoneItem, MilestoneStreamView
from app.services.canton_query_service import CantonQueryService
from app.services.command_builder import CommandBuilder
from app.utils.decimals import to_decimal


def _build_milestone_view(c: Any) -> MilestoneStreamView:
    p = c.payload
    raw_milestones = p.get("milestones") or []
    items: list[MilestoneItem] = []
    for m in raw_milestones:
        done_raw = m.get("done", False)
        done = done_raw is True or str(done_raw).lower() == "true"
        items.append(MilestoneItem(
            name=str(m.get("name", "")),
            amount=to_decimal(m.get("amount", "0")),
            done=done,
        ))

    pending = [i for i in items if not i.done]
    confirmed = [i for i in items if i.done]
    total_pending_amount = sum((i.amount for i in pending), Decimal("0"))

    return MilestoneStreamView(
        contract_id=c.contract_id,
        milestone_id=int(str(p.get("milestoneId", 0))),
        sender=str(p.get("sender", "")),
        receiver=str(p.get("receiver", "")),
        admin=str(p.get("admin", "")),
        milestones=items,
        deposited=to_decimal(p.get("deposited", "0")),
        pending_count=len(pending),
        confirmed_count=len(confirmed),
        total_pending_amount=total_pending_amount,
    )


class MilestoneService:
    def __init__(self, client: CantonClient, cmd: CommandBuilder) -> None:
        self._qs = CantonQueryService(client)
        self._client = client
        self._cmd = cmd

    async def list_milestones(self, party_id: str) -> list[MilestoneStreamView]:
        contracts = await self._qs.contracts_by_template(party_id, "MilestoneStream")
        return [_build_milestone_view(c) for c in contracts]

    async def confirm_milestone(
        self, contract_id: str, milestone_name: str, admin_party_id: str, request_id: str = ""
    ) -> dict:
        payload = self._cmd.milestone_confirm(contract_id, milestone_name, admin_party_id, request_id)
        return await self._client.submit_and_wait(payload)

    async def release_refund(
        self, contract_id: str, sender_party_id: str, request_id: str = ""
    ) -> dict:
        payload = self._cmd.milestone_refund(contract_id, sender_party_id, request_id)
        return await self._client.submit_and_wait(payload)

    async def force_cancel(
        self, contract_id: str, admin_party_id: str, request_id: str = ""
    ) -> dict:
        payload = self._cmd.milestone_force_refund(contract_id, admin_party_id, request_id)
        return await self._client.submit_and_wait(payload)
