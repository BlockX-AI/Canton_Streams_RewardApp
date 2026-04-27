from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.dependencies import RequestId, get_demo_service
from app.services.demo_service import DemoService

router = APIRouter(prefix="/demo", tags=["demo"])


def _require_demo(svc: DemoService = Depends(get_demo_service)) -> DemoService:
    if not settings.enable_demo_endpoints:
        raise HTTPException(status_code=403, detail="Demo endpoints are disabled")
    return svc


@router.get("/state")
async def demo_state(
    request_id: RequestId,
    svc: Annotated[DemoService, Depends(_require_demo)],
) -> dict:
    state = await svc.state()
    state["request_id"] = request_id
    return state


@router.get("/use-cases")
async def demo_use_cases(
    svc: Annotated[DemoService, Depends(_require_demo)],
) -> list[dict]:
    return await svc.use_cases()


@router.post("/run-cycle")
async def run_demo_cycle(
    request_id: RequestId,
    svc: Annotated[DemoService, Depends(_require_demo)],
) -> dict:
    state = await svc.state()
    return {
        "message": "Real ACS state fetched. Use the testing/index.js harness to exercise choices.",
        "request_id": request_id,
        "state_summary": {
            "active_streams": state["active_streams"],
            "lp_pools": len(state["lp_pools"]),
            "vesting_schedules": len(state["vesting_schedules"]),
            "milestones": len(state["milestones"]),
            "token_balances": state["token_balances"],
        },
    }
