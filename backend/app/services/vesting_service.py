from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.clients.canton_client import CantonClient
from app.models.vesting import VestingView
from app.services.canton_query_service import CantonQueryService
from app.services.command_builder import CommandBuilder
from app.utils.decimals import to_decimal
from app.utils.time import now_utc, parse_canton_time


def _build_vesting_view(c: Any) -> VestingView:
    p = c.payload
    now = now_utc()
    cliff_dt = parse_canton_time(str(p.get("cliffTime", "")))
    end_dt = parse_canton_time(str(p.get("vestingEnd", "")))
    total_amount = to_decimal(p.get("totalAmount", "0"))
    withdrawn = to_decimal(p.get("withdrawn", "0"))

    cliff_reached = cliff_dt is not None and now >= cliff_dt
    vested_fraction = Decimal("0")
    if cliff_reached and cliff_dt and end_dt and end_dt > cliff_dt:
        total_dur = (end_dt - cliff_dt).total_seconds()
        elapsed = (now - cliff_dt).total_seconds()
        vested_fraction = min(Decimal(str(elapsed / total_dur)), Decimal("1"))

    vested = total_amount * vested_fraction
    claimable = max(Decimal("0"), vested - withdrawn)

    return VestingView(
        contract_id=c.contract_id,
        vesting_id=int(str(p.get("vestingId", 0))),
        sender=str(p.get("sender", "")),
        receiver=str(p.get("receiver", "")),
        admin=str(p.get("admin", "")),
        cliff_time=str(p.get("cliffTime", "")),
        vesting_end=str(p.get("vestingEnd", "")),
        total_amount=total_amount,
        withdrawn=withdrawn,
        cliff_reached=cliff_reached,
        vested_fraction=vested_fraction,
        claimable_estimate=claimable,
    )


class VestingService:
    def __init__(self, client: CantonClient, cmd: CommandBuilder) -> None:
        self._qs = CantonQueryService(client)
        self._client = client
        self._cmd = cmd

    async def list_vesting(self, party_id: str) -> list[VestingView]:
        contracts = await self._qs.contracts_by_template(party_id, "VestingStream")
        return [_build_vesting_view(c) for c in contracts]

    async def withdraw(
        self, contract_id: str, receiver_party_id: str, request_id: str = ""
    ) -> dict:
        payload = self._cmd.vesting_withdraw(contract_id, receiver_party_id, request_id)
        return await self._client.submit_and_wait(payload)
