from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class APIError(BaseModel):
    code: str
    message: str
    request_id: str = ""
    details: Any = None


class ErrorResponse(BaseModel):
    error: APIError


class TxResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    update_id: str | None = None
    command_id: str | None = None
    request_id: str = ""
    ok: bool = True


class ContractRef(BaseModel):
    contract_id: str
    template_name: str


class PartyName(BaseModel):
    name: str
    party_id: str
