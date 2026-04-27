"""
Robust parser for Canton JSON API v2 active-contracts responses.

Handles all known response variants:
  1. NDJSON  — one JSON object per line
  2. Plain JSON array — [{contractEntry: ...}, ...]
  3. Envelope — {"result": [...]} or {"contracts": [...]}
  4. Mixed — some lines are arrays, some are objects
"""
from __future__ import annotations

import json
import logging
from typing import Any

log = logging.getLogger(__name__)


class ContractView:
    __slots__ = (
        "contract_id",
        "template_id",
        "template_name",
        "payload",
        "signatories",
        "observers",
        "created_at",
    )

    def __init__(
        self,
        contract_id: str,
        template_id: str,
        template_name: str,
        payload: dict[str, Any],
        signatories: list[str],
        observers: list[str],
        created_at: str | None,
    ) -> None:
        self.contract_id = contract_id
        self.template_id = template_id
        self.template_name = template_name
        self.payload = payload
        self.signatories = signatories
        self.observers = observers
        self.created_at = created_at

    def __repr__(self) -> str:
        return f"<ContractView {self.template_name} {self.contract_id[:16]}…>"


def _extract_created_event(obj: Any) -> dict[str, Any] | None:
    if not isinstance(obj, dict):
        return None

    # Unwrap contractEntry envelope
    entry = obj.get("contractEntry")
    if entry and isinstance(entry, dict):
        inner = next(iter(entry.values()), None)
        if inner and isinstance(inner, dict):
            ce = inner.get("createdEvent")
            if ce and isinstance(ce, dict) and ce.get("contractId"):
                return ce
    return None


def _parse_created_event(ce: dict[str, Any]) -> ContractView:
    contract_id: str = ce["contractId"]
    template_id: str = ce.get("templateId", "")
    template_name: str = template_id.split(":")[-1] if template_id else ""

    # Canton v2 uses createArgument; older used createArguments
    payload: dict[str, Any] = (
        ce.get("createArgument")
        or ce.get("createArguments")
        or {}
    )
    if isinstance(payload, dict):
        # sometimes nested under "fields" for proto-json
        if "fields" in payload and isinstance(payload["fields"], dict):
            payload = payload["fields"]

    signatories: list[str] = ce.get("signatories") or []
    observers: list[str] = ce.get("observers") or []
    created_at: str | None = ce.get("createdAt") or ce.get("created_at")

    return ContractView(
        contract_id=contract_id,
        template_id=template_id,
        template_name=template_name,
        payload=payload,
        signatories=signatories,
        observers=observers,
        created_at=created_at,
    )


def _collect_objects(raw: str) -> list[Any]:
    raw = raw.strip()
    if not raw:
        return []

    # Try direct JSON first (might be a single array or single object)
    try:
        top = json.loads(raw)
        if isinstance(top, list):
            return top
        if isinstance(top, dict):
            # Check for envelope wrappers
            for key in ("result", "contracts", "activeContracts"):
                val = top.get(key)
                if isinstance(val, list):
                    return val
            return [top]
    except json.JSONDecodeError:
        pass

    # NDJSON — parse line by line
    objects: list[Any] = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            parsed = json.loads(line)
            if isinstance(parsed, list):
                objects.extend(parsed)
            else:
                objects.append(parsed)
        except json.JSONDecodeError:
            log.debug("Skipping malformed ACS line: %s…", line[:80])
    return objects


def parse_active_contracts(raw: str) -> list[ContractView]:
    objects = _collect_objects(raw)
    contracts: list[ContractView] = []
    for obj in objects:
        ce = _extract_created_event(obj)
        if ce is None:
            continue
        try:
            contracts.append(_parse_created_event(ce))
        except Exception as exc:
            log.debug("Failed to parse contract entry: %s", exc)
    return contracts


def filter_by_template(
    contracts: list[ContractView],
    template_name: str,
) -> list[ContractView]:
    return [c for c in contracts if c.template_name == template_name]


def find_by_contract_id(
    contracts: list[ContractView],
    contract_id: str,
) -> ContractView | None:
    return next((c for c in contracts if c.contract_id == contract_id), None)
