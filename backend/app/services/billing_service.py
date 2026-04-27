from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.clients.canton_client import CantonClient
from app.models.billing import BillingSessionView
from app.services.canton_query_service import CantonQueryService
from app.services.command_builder import CommandBuilder
from app.utils.decimals import to_decimal, safe_subtract
from app.utils.time import seconds_since


def _build_billing_view(c: Any) -> BillingSessionView:
    p = c.payload
    status = str(p.get("status", ""))
    flow_rate = to_decimal(p.get("flowRate", "0"))
    deposited = to_decimal(p.get("deposited", "0"))
    billed_total = to_decimal(p.get("withdrawn", "0"))
    last_update = str(p.get("lastUpdate", "")) or None

    remaining = safe_subtract(deposited, billed_total)
    elapsed = seconds_since(last_update) if status == "Active" else 0.0
    billed_session_est = min(flow_rate * Decimal(str(elapsed)), remaining)

    return BillingSessionView(
        contract_id=c.contract_id,
        stream_id=int(str(p.get("streamId", 0))),
        client=str(p.get("sender", "")),
        provider=str(p.get("receiver", "")),
        admin=str(p.get("admin", "")),
        flow_rate=flow_rate,
        deposited=deposited,
        billed_total=billed_total,
        status=status,
        last_update=last_update,
        billed_this_session_estimate=billed_session_est,
        remaining=remaining,
    )


class BillingService:
    def __init__(self, client: CantonClient, cmd: CommandBuilder) -> None:
        self._qs = CantonQueryService(client)
        self._client = client
        self._cmd = cmd

    async def list_sessions(self, party_id: str) -> list[BillingSessionView]:
        contracts = await self._qs.contracts_by_template(party_id, "StreamAgreement")
        return [_build_billing_view(c) for c in contracts]

    async def pause_session(
        self, contract_id: str, sender_party_id: str, request_id: str = ""
    ) -> dict:
        payload = self._cmd.stream_pause(contract_id, sender_party_id, request_id)
        return await self._client.submit_and_wait(payload)

    async def resume_session(
        self, contract_id: str, sender_party_id: str, request_id: str = ""
    ) -> dict:
        payload = self._cmd.stream_resume(contract_id, sender_party_id, request_id)
        return await self._client.submit_and_wait(payload)
