"""
CantonQueryService: ACS query helpers shared by all domain services.
Queries Canton, parses NDJSON/array response, returns ContractView list.
Never fabricates contract state.
"""
from __future__ import annotations

from app.clients.canton_client import CantonClient
from app.utils.parsing import ContractView, filter_by_template, find_by_contract_id, parse_active_contracts
from app.utils.errors import ContractNotFoundError


class CantonQueryService:
    def __init__(self, client: CantonClient) -> None:
        self._client = client

    async def all_contracts(self, party_id: str) -> list[ContractView]:
        raw = await self._client.query_active_contracts_raw(party_id)
        return parse_active_contracts(raw)

    async def contracts_by_template(
        self,
        party_id: str,
        template_name: str,
    ) -> list[ContractView]:
        all_c = await self.all_contracts(party_id)
        return filter_by_template(all_c, template_name)

    async def get_contract(
        self,
        party_id: str,
        contract_id: str,
    ) -> ContractView:
        all_c = await self.all_contracts(party_id)
        cv = find_by_contract_id(all_c, contract_id)
        if cv is None:
            raise ContractNotFoundError(contract_id)
        return cv
