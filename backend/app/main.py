from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.clients.canton_client import CantonClient
from app.config import settings
from app.models.common import APIError, ErrorResponse
from app.services.command_builder import CommandBuilder
from app.utils.errors import CantonError, CantonUnavailableError, ContractNotFoundError
from app.utils.request_id import RequestIDMiddleware, get_request_id

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    log.info("Starting %s — connecting to Canton at %s", settings.app_name, settings.canton_ledger_api_url)
    client = CantonClient(
        base_url=settings.canton_ledger_api_url,
        user_id=settings.canton_user_id,
        timeout=settings.canton_timeout_seconds,
    )
    cmd = CommandBuilder(
        package_id=settings.canton_package_id,
        user_id=settings.canton_user_id,
        all_party_ids=settings.all_party_ids(),
    )
    app.state.canton_client = client
    app.state.command_builder = cmd
    log.info("Canton client ready. Known parties: %s", list(settings.known_parties().keys()))
    yield
    log.info("Shutting down — closing Canton HTTP client")
    await client.aclose()


app = FastAPI(
    title="GrowStreams API",
    description=(
        "FastAPI wrapper for GrowStreams Canton LocalNet Daml contracts. "
        "Canton is source of truth. FastAPI owns request validation and response normalization."
    ),
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _error_response(request: Request, status: int, code: str, message: str, details: Any = None) -> JSONResponse:
    rid = get_request_id(request)
    return JSONResponse(
        status_code=status,
        content=ErrorResponse(
            error=APIError(code=code, message=message, request_id=rid, details=details)
        ).model_dump(),
        headers={"X-Request-ID": rid},
    )


@app.exception_handler(CantonUnavailableError)
async def canton_unavailable_handler(request: Request, exc: CantonUnavailableError) -> JSONResponse:
    log.error("Canton unavailable: %s", exc.message)
    return _error_response(request, 503, exc.code, exc.message)


@app.exception_handler(CantonError)
async def canton_error_handler(request: Request, exc: CantonError) -> JSONResponse:
    log.warning("Canton error [%s]: %s", exc.code, exc.message)
    return _error_response(request, exc.http_status(), exc.code, exc.user_message(), exc.details)


@app.exception_handler(ContractNotFoundError)
async def contract_not_found_handler(request: Request, exc: ContractNotFoundError) -> JSONResponse:
    return _error_response(request, 404, "CONTRACT_NOT_FOUND", str(exc))


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return _error_response(request, 422, "VALIDATION_ERROR", str(exc))


@app.exception_handler(Exception)
async def generic_handler(request: Request, exc: Exception) -> JSONResponse:
    log.exception("Unhandled error: %s", exc)
    return _error_response(request, 500, "INTERNAL_ERROR", "An unexpected error occurred.")


from app.routes import (  # noqa: E402
    billing,
    canton,
    demo,
    health,
    lp_pools,
    milestones,
    parties,
    streams,
    subscriptions,
    tokens,
    vesting,
)

app.include_router(health.router)
app.include_router(canton.router)
app.include_router(parties.router)
app.include_router(tokens.router)
app.include_router(streams.router)
app.include_router(lp_pools.router)
app.include_router(billing.router)
app.include_router(vesting.router)
app.include_router(subscriptions.router)
app.include_router(milestones.router)
app.include_router(demo.router)
