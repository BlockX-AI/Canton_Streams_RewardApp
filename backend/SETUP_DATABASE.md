# Database Setup for Canton Stream Reward

This document explains how to set up PostgreSQL for the campaign/reward system.

## Prerequisites

- PostgreSQL 14+ (local or cloud)
- Python 3.11+

## Environment Variables

Add these to your `.env` file in the backend directory:

```bash
# Database (required for campaign/reward features)
DATABASE_URL=postgresql://user:password@localhost:5432/canton_streams
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
```

## Running Migrations

1. Ensure PostgreSQL is running and the database exists:
```bash
createdb canton_streams
```

2. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

3. Run migrations:
```bash
python run_migrations.py
```

This will create all required tables:
- `users` - User accounts with referral codes
- `referrals` - Referral relationships
- `participants` - Campaign participants
- `contributions` - User contributions (OSS/Content)
- `xp_events` - XP award history
- `daily_snapshots` - Leaderboard snapshots
- `campaigns` - Campaign definitions
- `campaign_participants` - Campaign enrollment
- `campaign_payouts` - Payout records

## Schema Overview

The schema is adapted from GrowStreams_Backend but **excludes all Vara-specific fields**:
- No VFT token references
- No bridge transaction tracking
- No VARA-specific prize pools
- Asset-agnostic (works with CC, USDCx, or any CIP-56 token)

## Testing

Once the database is set up, the API will automatically:
- Initialize connection pool on startup
- Serve campaign/leaderboard endpoints at `/api/campaigns` and `/api/leaderboard`
- Support participant stats at `/api/participants/{wallet}/stats`

## Cloud Options

- **Supabase**: Free tier available, provides managed PostgreSQL
- **Neon**: Serverless PostgreSQL, good for development
- **Railway**: Easy deployment with built-in PostgreSQL
- **DigitalOcean Managed Database**: Production-ready

Example Supabase connection string:
```bash
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres
```
