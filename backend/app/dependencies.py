from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request

from app.clients.canton_client import CantonClient
from app.config import settings
from app.services.billing_service import BillingService
from app.services.command_builder import CommandBuilder
from app.services.demo_service import DemoService
from app.services.lp_pool_service import LPPoolService
from app.services.milestone_service import MilestoneService
from app.services.stream_service import StreamService
from app.services.token_service import TokenService
from app.services.vesting_service import VestingService
from app.utils.request_id import get_request_id


def get_canton_client(request: Request) -> CantonClient:
    return request.app.state.canton_client


def get_command_builder(request: Request) -> CommandBuilder:
    return request.app.state.command_builder


def get_stream_service(
    client: Annotated[CantonClient, Depends(get_canton_client)],
    cmd: Annotated[CommandBuilder, Depends(get_command_builder)],
) -> StreamService:
    return StreamService(client, cmd, settings.known_parties())


def get_token_service(
    client: Annotated[CantonClient, Depends(get_canton_client)],
) -> TokenService:
    return TokenService(client, settings.known_parties())


def get_lp_pool_service(
    client: Annotated[CantonClient, Depends(get_canton_client)],
    cmd: Annotated[CommandBuilder, Depends(get_command_builder)],
) -> LPPoolService:
    return LPPoolService(client, cmd)


def get_billing_service(
    client: Annotated[CantonClient, Depends(get_canton_client)],
    cmd: Annotated[CommandBuilder, Depends(get_command_builder)],
) -> BillingService:
    return BillingService(client, cmd)


def get_vesting_service(
    client: Annotated[CantonClient, Depends(get_canton_client)],
    cmd: Annotated[CommandBuilder, Depends(get_command_builder)],
) -> VestingService:
    return VestingService(client, cmd)


def get_milestone_service(
    client: Annotated[CantonClient, Depends(get_canton_client)],
    cmd: Annotated[CommandBuilder, Depends(get_command_builder)],
) -> MilestoneService:
    return MilestoneService(client, cmd)


def get_demo_service(
    client: Annotated[CantonClient, Depends(get_canton_client)],
) -> DemoService:
    return DemoService(client, settings.known_parties())


RequestId = Annotated[str, Depends(get_request_id)]
