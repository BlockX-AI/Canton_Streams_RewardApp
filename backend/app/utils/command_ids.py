from __future__ import annotations

import hashlib
import json
import time


def deterministic_command_id(
    contract_id: str,
    choice: str,
    args: dict,
    request_id: str = "",
) -> str:
    payload = json.dumps(
        {"cid": contract_id, "choice": choice, "args": args, "rid": request_id},
        sort_keys=True,
    )
    digest = hashlib.sha256(payload.encode()).hexdigest()[:24]
    safe_choice = choice.lower().replace("_", "")[:16]
    return f"gs-{safe_choice}-{digest}"


def idempotent_command_id(
    template_path: str,
    choice: str,
    request_id: str,
) -> str:
    payload = f"{template_path}:{choice}:{request_id}"
    digest = hashlib.sha256(payload.encode()).hexdigest()[:24]
    safe_choice = choice.lower().replace("_", "")[:16]
    return f"gs-{safe_choice}-{digest}"


def timestamped_command_id(prefix: str = "gs") -> str:
    ts = int(time.time() * 1000)
    nonce = hashlib.sha256(str(time.time_ns()).encode()).hexdigest()[:8]
    return f"{prefix}-{ts}-{nonce}"
