"""
Canton JSON API v2 async HTTP client.

Wraps all Canton endpoints. Does not contain any business logic.
Raises typed CantonError / CantonUnavailableError on failure.
Never swallows Canton error responses.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.utils.errors import CantonError, CantonUnavailableError

log = logging.getLogger(__name__)


class CantonClient:
    def __init__(self, base_url: str, user_id: str, timeout: float = 30.0) -> None:
        self._base_url = base_url.rstrip("/")
        self.user_id = user_id
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=httpx.Timeout(timeout),
            headers={"Content-Type": "application/json"},
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    def _raise_for_canton_error(self, r: httpx.Response) -> None:
        if r.status_code < 400:
            return
        try:
            data = r.json()
        except Exception:
            data = {"raw": r.text[:500]}
        code = data.get("code") or data.get("grpcCode") or "CANTON_ERROR"
        message = (
            data.get("message")
            or data.get("cause")
            or data.get("error")
            or str(data)[:300]
        )
        log.warning("Canton error %s: %s %s", r.status_code, code, message)
        raise CantonError(status=r.status_code, code=str(code), message=message, details=data)

    async def _get(self, path: str) -> dict[str, Any]:
        try:
            r = await self._client.get(path)
            self._raise_for_canton_error(r)
            return r.json()  # type: ignore[return-value]
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise CantonUnavailableError(str(exc)) from exc

    async def _post_json(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        try:
            r = await self._client.post(path, json=body)
            self._raise_for_canton_error(r)
            return r.json()  # type: ignore[return-value]
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise CantonUnavailableError(str(exc)) from exc

    async def _post_bytes(self, path: str, data: bytes, content_type: str) -> dict[str, Any]:
        try:
            r = await self._client.post(
                path,
                content=data,
                headers={"Content-Type": content_type},
            )
            self._raise_for_canton_error(r)
            return r.json()  # type: ignore[return-value]
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise CantonUnavailableError(str(exc)) from exc

    async def get_version(self) -> dict[str, Any]:
        return await self._get("/v2/version")

    async def get_ledger_end(self) -> str | int:
        data = await self._get("/v2/state/ledger-end")
        return data.get("offset") or data.get("absolute") or 0  # type: ignore[return-value]

    async def list_parties(self) -> list[dict[str, Any]]:
        data = await self._get("/v2/parties")
        parties = data.get("partyDetails") or data.get("parties") or []
        return parties if isinstance(parties, list) else []

    async def list_packages(self) -> list[str]:
        data = await self._get("/v2/packages")
        ids = data.get("packageIds") or []
        return ids if isinstance(ids, list) else []

    async def upload_dar(self, dar_bytes: bytes) -> dict[str, Any]:
        return await self._post_bytes("/v2/packages", dar_bytes, "application/octet-stream")

    async def submit_and_wait(self, payload: dict[str, Any]) -> dict[str, Any]:
        log.debug(
            "submit_and_wait commandId=%s choice=%s",
            payload.get("commandId"),
            (payload.get("commands") or [{}])[0].get("ExerciseCommand", {}).get("choice"),
        )
        return await self._post_json("/v2/commands/submit-and-wait", payload)

    async def allocate_party(self, display_name: str, party_id_hint: str | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "partyIdHint": party_id_hint or display_name,
            "displayName": display_name,
            "userId": self.user_id,
        }
        return await self._post_json("/v2/parties", payload)

    async def query_active_contracts_raw(
        self,
        party_id: str,
        template_filter: str | None = None,
    ) -> str:
        offset = await self.get_ledger_end()

        filter_value: dict[str, Any] = {}
        if template_filter:
            filter_value = {
                "cumulative": [{
                    "templateFilter": {
                        "value": {"templateId": template_filter}
                    }
                }]
            }

        body: dict[str, Any] = {
            "filter": {"filtersByParty": {party_id: filter_value}},
            "verbose": True,
            "activeAtOffset": offset,
            "userId": self.user_id,
        }

        try:
            r = await self._client.post(
                "/v2/state/active-contracts",
                json=body,
                headers={"Content-Type": "application/json"},
            )
            if r.status_code >= 400:
                self._raise_for_canton_error(r)
            return r.text
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise CantonUnavailableError(str(exc)) from exc
