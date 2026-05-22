from __future__ import annotations

from datetime import datetime
from typing import Any

from app.db import execute, fetch, fetch_all, fetch_val
from app.models.participants import Participant, ParticipantCreate, ParticipantStats, TrackType


async def get_or_create_participant(data: ParticipantCreate) -> Participant:
    existing = await fetch("SELECT * FROM participants WHERE wallet = $1", data.wallet)
    if existing:
        return _row_to_participant(existing)

    now = datetime.utcnow()
    row = await fetch(
        """
        INSERT INTO participants (wallet, github_handle, x_handle, display_name, track, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        """,
        data.wallet,
        data.github_handle,
        data.x_handle,
        data.display_name or data.wallet[:12],
        data.track.value,
        now,
        now,
    )

    if not row:
        raise RuntimeError("Failed to create participant")

    return _row_to_participant(row)


async def get_participant(wallet: str) -> Participant | None:
    row = await fetch("SELECT * FROM participants WHERE wallet = $1", wallet)
    if not row:
        return None
    return _row_to_participant(row)


async def get_participant_stats(wallet: str) -> ParticipantStats:
    row = await fetch("SELECT * FROM participants WHERE wallet = $1", wallet)
    if not row:
        raise ValueError("Participant not found")

    rank_row = await fetch_val(
        """
        SELECT COUNT(*) + 1
        FROM participants
        WHERE total_xp > (SELECT total_xp FROM participants WHERE wallet = $1)
        """,
        wallet,
    )

    return ParticipantStats(
        wallet=row["wallet"],
        display_name=row["display_name"],
        github_handle=row["github_handle"],
        x_handle=row["x_handle"],
        track=TrackType(row["track"]),
        total_xp=row["total_xp"],
        rank=int(rank_row) if rank_row else None,
        campaign_xp=None,
    )


async def update_participant_xp(wallet: str, xp_delta: int) -> Participant:
    row = await fetch(
        """
        UPDATE participants
        SET total_xp = total_xp + $1, updated_at = NOW()
        WHERE wallet = $2
        RETURNING *
        """,
        xp_delta,
        wallet,
    )

    if not row:
        raise ValueError("Participant not found")

    return _row_to_participant(row)


def _row_to_participant(row: dict[str, Any]) -> Participant:
    return Participant(
        id=row["id"],
        wallet=row["wallet"],
        github_handle=row["github_handle"],
        x_handle=row["x_handle"],
        display_name=row["display_name"],
        track=TrackType(row["track"]),
        total_xp=row["total_xp"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )
