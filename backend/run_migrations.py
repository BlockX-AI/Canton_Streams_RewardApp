#!/usr/bin/env python3
"""
Simple migration runner for Canton Stream Reward database.
Run this to initialize the database schema.
"""

import asyncio
import os
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

load_dotenv()

MIGRATIONS_DIR = Path(__file__).parent / "app" / "migrations"


async def run_migration(conn: asyncpg.Connection, migration_file: Path) -> None:
    """Run a single migration SQL file."""
    print(f"Running migration: {migration_file.name}")
    sql = migration_file.read_text()
    await conn.execute(sql)
    print(f"✓ Completed: {migration_file.name}")


async def main() -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not set in environment")
        return

    print("Connecting to database...")
    conn = await asyncpg.connect(database_url)

    try:
        migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))

        if not migration_files:
            print("No migration files found")
            return

        print(f"Found {len(migration_files)} migration file(s)")

        for migration_file in migration_files:
            await run_migration(conn, migration_file)

        print("\n✓ All migrations completed successfully")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
