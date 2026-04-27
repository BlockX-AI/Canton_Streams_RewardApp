from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.clients.canton_client import CantonClient
from app.config import settings
from app.dependencies import RequestId, get_canton_client
from app.utils.time import now_iso

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(
    request_id: RequestId,
    client: Annotated[CantonClient, Depends(get_canton_client)],
) -> dict:
    canton_ok = False
    canton_version = None
    try:
        data = await client.get_version()
        canton_ok = True
        canton_version = data.get("version")
    except Exception as exc:
        canton_version = f"unreachable: {exc}"

    return {
        "status": "ok" if canton_ok else "degraded",
        "service": settings.app_name,
        "env": settings.app_env,
        "canton_reachable": canton_ok,
        "canton_version": canton_version,
        "timestamp": now_iso(),
        "request_id": request_id,
    }
