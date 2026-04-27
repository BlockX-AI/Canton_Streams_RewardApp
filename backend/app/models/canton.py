from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class CantonVersionResponse(BaseModel):
    version: str
    features: dict[str, Any] | None = None
    raw: dict[str, Any] | None = None


class LedgerEndResponse(BaseModel):
    offset: Any


class PackageListResponse(BaseModel):
    package_ids: list[str]


class PartyDetails(BaseModel):
    party_id: str
    display_name: str | None = None
    is_local: bool | None = None


class PartyListResponse(BaseModel):
    parties: list[PartyDetails]


class AllocatePartyRequest(BaseModel):
    display_name: str
    party_id_hint: str | None = None
