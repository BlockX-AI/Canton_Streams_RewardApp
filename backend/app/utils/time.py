from __future__ import annotations

from datetime import datetime, timezone


def now_utc() -> datetime:
    return datetime.now(tz=timezone.utc)


def now_iso() -> str:
    return now_utc().isoformat()


def parse_canton_time(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        s = value.replace("Z", "+00:00")
        return datetime.fromisoformat(s)
    except (ValueError, AttributeError):
        return None


def seconds_since(iso_time: str | None) -> float:
    dt = parse_canton_time(iso_time)
    if dt is None:
        return 0.0
    delta = now_utc() - dt.astimezone(timezone.utc)
    return max(0.0, delta.total_seconds())
