from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile

from app.clients.canton_client import CantonClient
from app.dependencies import RequestId, get_canton_client
from app.models.canton import (
    CantonVersionResponse,
    LedgerEndResponse,
    PackageListResponse,
    PartyDetails,
    PartyListResponse,
)

router = APIRouter(prefix="/canton", tags=["canton"])


@router.get("/version", response_model=CantonVersionResponse)
async def get_version(
    client: Annotated[CantonClient, Depends(get_canton_client)],
) -> CantonVersionResponse:
    data = await client.get_version()
    return CantonVersionResponse(
        version=data.get("version", "unknown"),
        features=data.get("features"),
        raw=data,
    )


@router.get("/ledger-end", response_model=LedgerEndResponse)
async def get_ledger_end(
    client: Annotated[CantonClient, Depends(get_canton_client)],
) -> LedgerEndResponse:
    offset = await client.get_ledger_end()
    return LedgerEndResponse(offset=offset)


@router.get("/packages", response_model=PackageListResponse)
async def list_packages(
    client: Annotated[CantonClient, Depends(get_canton_client)],
) -> PackageListResponse:
    ids = await client.list_packages()
    return PackageListResponse(package_ids=ids)


@router.post("/packages/upload")
async def upload_package(
    file: UploadFile,
    client: Annotated[CantonClient, Depends(get_canton_client)],
    request_id: RequestId,
) -> dict:
    if not file.filename or not file.filename.endswith(".dar"):
        raise HTTPException(status_code=400, detail="File must be a .dar archive")
    data = await file.read()
    result = await client.upload_dar(data)
    return {"ok": True, "request_id": request_id, "result": result}
