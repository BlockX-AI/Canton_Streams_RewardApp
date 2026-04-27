from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.clients.canton_client import CantonClient
from app.models.lp_pools import LPPoolView, MemberStateView
from app.services.canton_query_service import CantonQueryService
from app.services.command_builder import CommandBuilder
from app.utils.decimals import to_decimal, safe_subtract
from app.utils.time import seconds_since


def _build_pool_view(c: Any) -> LPPoolView:
    p = c.payload
    deposited = to_decimal(p.get("deposited", "0"))
    total_withdrawn = to_decimal(p.get("totalWithdrawn", "0"))
    total_units = to_decimal(p.get("totalUnits", "1"))
    available = safe_subtract(deposited, total_withdrawn)
    total_rate = to_decimal(p.get("totalRate", "0"))

    raw_members = p.get("memberStates") or []
    members: list[MemberStateView] = []
    for m in raw_members:
        units = to_decimal(m.get("units", "0"))
        share = (units / total_units * Decimal("100")) if total_units > 0 else Decimal("0")
        elapsed = seconds_since(str(m.get("lastUpdate", "")))
        member_rate = total_rate * units / total_units if total_units > 0 else Decimal("0")
        accrued_raw = member_rate * Decimal(str(elapsed))
        accrued = min(accrued_raw, available)

        members.append(MemberStateView(
            party=str(m.get("party", "")),
            party_name=str(m.get("party", "")).split("::")[0],
            units=units,
            withdrawn=to_decimal(m.get("withdrawn", "0")),
            share_percent=share,
            last_update=str(m.get("lastUpdate", "")) or None,
            accrued_estimate=accrued,
        ))

    return LPPoolView(
        contract_id=c.contract_id,
        pool_id=int(str(p.get("poolId", 0))),
        admin=str(p.get("admin", "")),
        total_rate=total_rate,
        deposited=deposited,
        total_withdrawn=total_withdrawn,
        available=available,
        status=str(p.get("status", "")),
        total_units=total_units,
        members=members,
    )


class LPPoolService:
    def __init__(self, client: CantonClient, cmd: CommandBuilder) -> None:
        self._qs = CantonQueryService(client)
        self._client = client
        self._cmd = cmd

    async def list_pools(self, party_id: str) -> list[LPPoolView]:
        contracts = await self._qs.contracts_by_template(party_id, "StreamPool")
        return [_build_pool_view(c) for c in contracts]

    async def withdraw_share(
        self, contract_id: str, member_party_id: str, request_id: str = ""
    ) -> dict:
        payload = self._cmd.pool_withdraw_member(contract_id, member_party_id, request_id)
        return await self._client.submit_and_wait(payload)

    async def top_up(
        self, contract_id: str, amount: Decimal, admin_party_id: str, request_id: str = ""
    ) -> dict:
        payload = self._cmd.pool_top_up(contract_id, amount, admin_party_id, request_id)
        return await self._client.submit_and_wait(payload)
