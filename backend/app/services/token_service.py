from __future__ import annotations

from decimal import Decimal

from app.clients.canton_client import CantonClient
from app.models.tokens import BalancesResponse, PartyBalance, TokenBalance
from app.services.canton_query_service import CantonQueryService
from app.utils.decimals import to_decimal


class TokenService:
    def __init__(self, client: CantonClient, known_parties: dict[str, str]) -> None:
        self._qs = CantonQueryService(client)
        self._known_parties = known_parties
        self._party_names = {v: k for k, v in known_parties.items()}

    async def list_tokens(self, party_id: str) -> list[TokenBalance]:
        contracts = await self._qs.contracts_by_template(party_id, "GrowToken")
        result: list[TokenBalance] = []
        for c in contracts:
            p = c.payload
            result.append(TokenBalance(
                contract_id=c.contract_id,
                owner=str(p.get("owner", "")),
                issuer=str(p.get("issuer", "")),
                amount=to_decimal(p.get("amount", "0")),
                symbol=str(p.get("symbol", "GROW")),
            ))
        return result

    async def get_balance(self, party_id: str) -> Decimal:
        tokens = await self.list_tokens(party_id)
        return sum((t.amount for t in tokens), Decimal("0"))

    async def all_balances(self) -> BalancesResponse:
        balances: list[PartyBalance] = []
        for name, pid in self._known_parties.items():
            tokens = await self.list_tokens(pid)
            total = sum((t.amount for t in tokens), Decimal("0"))
            balances.append(PartyBalance(
                party_id=pid,
                party_name=name,
                total_grow=total,
                token_count=len(tokens),
            ))
        return BalancesResponse(balances=balances)
