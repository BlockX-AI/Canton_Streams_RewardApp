from __future__ import annotations

import asyncpg
from contextlib import asynccontextmanager
from typing import AsyncIterator

from app.config import settings

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        if not settings.database_url:
            raise RuntimeError("DATABASE_URL not configured")
        _pool = await asyncpg.create_pool(
            dsn=settings.database_url,
            min_size=1,
            max_size=settings.database_pool_size,
            command_timeout=60,
        )
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def get_connection() -> AsyncIterator[asyncpg.Connection]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        yield conn


async def execute(query: str, *args) -> str:
    async with get_connection() as conn:
        return await conn.execute(query, *args)


async def fetch(query: str, *args) -> asyncpg.Record | None:
    async with get_connection() as conn:
        return await conn.fetchrow(query, *args)


async def fetch_all(query: str, *args) -> list[asyncpg.Record]:
    async with get_connection() as conn:
        return await conn.fetch(query, *args)


async def fetch_val(query: str, *args, column: int = 0):
    async with get_connection() as conn:
        return await conn.fetchval(query, *args, column=column)
