from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.clients.canton_client import CantonClient
from app.models.streams import StreamView, WithdrawResponse
from app.services.canton_query_service import CantonQueryService
from app.services.command_builder import CommandBuilder
from app.utils.decimals import to_decimal, safe_subtract
from app.utils.time import seconds_since


def _build_stream_view(c: Any) -> StreamView:
    p = c.payload
    status = str(p.get("status", ""))
    flow_rate = to_decimal(p.get("flowRate", "0"))
    deposited = to_decimal(p.get("deposited", "0"))
    withdrawn = to_decimal(p.get("withdrawn", "0"))
    last_update = str(p.get("lastUpdate", "")) or None

    available = safe_subtract(deposited, withdrawn)
    elapsed = seconds_since(last_update)
    accrued_raw = flow_rate * Decimal(str(elapsed)) if status == "Active" else Decimal("0")
    accrued = min(accrued_raw, available)

    coverage = float(available / flow_rate) if flow_rate > 0 and status == "Active" else None

    return StreamView(
        contract_id=c.contract_id,
        stream_id=int(str(p.get("streamId", 0))),
        sender=str(p.get("sender", "")),
        receiver=str(p.get("receiver", "")),
        admin=str(p.get("admin", "")),
        flow_rate=flow_rate,
        deposited=deposited,
        withdrawn=withdrawn,
        status=status,
        start_time=str(p.get("startTime", "")) or None,
        last_update=last_update,
        accrued_estimate=accrued,
        available=available,
        coverage_seconds=coverage,
    )


class StreamService:
    def __init__(
        self,
        client: CantonClient,
        cmd: CommandBuilder,
        known_parties: dict[str, str],
    ) -> None:
        self._qs = CantonQueryService(client)
        self._client = client
        self._cmd = cmd
        self._known_parties = known_parties

    def _party_id(self, name: str) -> str:
        pid = self._known_parties.get(name)
        if not pid:
            raise ValueError(f"Unknown party name: {name!r}")
        return pid

    async def list_streams(self, party_id: str) -> list[StreamView]:
        contracts = await self._qs.contracts_by_template(party_id, "StreamAgreement")
        return [_build_stream_view(c) for c in contracts]

    async def get_stream(self, party_id: str, contract_id: str) -> StreamView:
        c = await self._qs.get_contract(party_id, contract_id)
        return _build_stream_view(c)

    async def withdraw(
        self, contract_id: str, receiver_party_id: str, request_id: str = ""
    ) -> WithdrawResponse:
        # Always re-fetch to get current accrued estimate (Withdraw is consuming)
        contracts = await self._qs.contracts_by_template(receiver_party_id, "StreamAgreement")
        match = next((c for c in contracts if c.contract_id == contract_id), None)
        accrued_estimate: Decimal | None = None
        if match:
            sv = _build_stream_view(match)
            accrued_estimate = sv.accrued_estimate

        payload = self._cmd.stream_withdraw(contract_id, receiver_party_id, request_id)
        result = await self._client.submit_and_wait(payload)
        return WithdrawResponse(
            contract_id=contract_id,
            amount_estimate=accrued_estimate,
            tx_result=result,
        )

    async def pause(self, contract_id: str, sender_party_id: str, request_id: str = "") -> dict:
        payload = self._cmd.stream_pause(contract_id, sender_party_id, request_id)
        return await self._client.submit_and_wait(payload)

    async def resume(self, contract_id: str, sender_party_id: str, request_id: str = "") -> dict:
        payload = self._cmd.stream_resume(contract_id, sender_party_id, request_id)
        return await self._client.submit_and_wait(payload)

    async def stop(self, contract_id: str, sender_party_id: str, request_id: str = "") -> dict:
        payload = self._cmd.stream_stop(contract_id, sender_party_id, request_id)
        return await self._client.submit_and_wait(payload)

    async def top_up(
        self, contract_id: str, amount: Decimal, sender_party_id: str, request_id: str = ""
    ) -> dict:
        payload = self._cmd.stream_top_up(contract_id, amount, sender_party_id, request_id)
        return await self._client.submit_and_wait(payload)
