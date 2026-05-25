# Railway Deployment Guide

This FastAPI backend is ready for Railway deployment with full CRUD operations.

## CRUD Operations Available

### Participants
- **Create**: `POST /participants/register` — Register new user with Canton Party ID
- **Read**: `GET /participants` — List all participants
- **Read**: `GET /participants/{wallet}` — Get participant by wallet
- **Read**: `GET /participants/{wallet}/stats` — Get participant stats/rank
- **Update**: XP updated via `POST /contributions` (internal)

### Campaigns
- **Create**: `POST /campaigns` — Create new campaign
- **Read**: `GET /campaigns` — List campaigns (with filters)
- **Read**: `GET /campaigns/{id}` — Get campaign details
- **Read**: `GET /campaigns/active` — Get active campaigns
- **Update**: `POST /campaigns/{id}/fund` — Fund campaign
- **Update**: `POST /campaigns/{id}/enroll` — Enroll participant
- **Read**: `GET /campaigns/{id}/participants` — List campaign participants
- **Read**: `GET /campaigns/{id}/leaderboard` — Campaign leaderboard
- **Read**: `GET /campaigns/{id}/payout-preview` — Preview payouts
- **Update**: `POST /campaigns/{id}/payout` — Execute payouts

### Contributions (XP tracking)
- **Create**: `POST /contributions` — Submit contribution for XP

### Leaderboard
- **Read**: `GET /leaderboard` — Global leaderboard

### Canton Integration
- **Read**: `GET /canton/version` — Canton version
- **Read**: `GET /canton/packages` — List packages
- **Read**: `GET /canton/ledger-end` — Ledger end offset
- **Read**: `GET /parties` — List parties

### Streams & Tokens
- **Read**: `GET /streams` — List streams by party
- **Read**: `GET /tokens` — List tokens by party

## Railway Setup

### 1. Create New Project
```bash
railway init
```

### 2. Add PostgreSQL Service
```bash
railway add postgresql
```

### 3. Set Environment Variables

In Railway dashboard, set these variables:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@host:5432/railway` |
| `CANTON_LEDGER_API_URL` | Canton Ledger API URL | `http://your-canton-host:7575` |
| `CANTON_VALIDATOR_API_URL` | Splice Validator API URL | `http://your-validator-host:80` |
| `CANTON_ADMIN_TOKEN` | Validator admin token | `your-admin-token` |
| `CANTON_NAMESPACE` | Namespace fingerprint | `1220f42cead6c3bf0443af1f0e51ee250afb48ee528756945ee2733cbfef62c10986` |
| `CANTON_PACKAGE_ID` | Daml package ID | `054d83ae7849878d487d4522881260c5aa599c4c25244040232251cd0c3b5b9c` |
| `CORS_ORIGINS` | Allowed CORS origins | `https://growstreams.xyz,https://your-frontend.vercel.app` |
| `APP_ENV` | Environment | `production` |

### 4. Run Migrations

Railway will build and deploy. After first deploy, run migrations:

```bash
railway run python run_migrations.py
```

Or add a migration job in Railway dashboard.

### 5. Deploy

```bash
railway up
```

## Files for Railway

- `Procfile` — Defines web process (uvicorn)
- `nixpacks.toml` — Build configuration
- `railway.json` — Railway deployment settings
- `requirements.txt` — Python dependencies

## Health Check

Railway will automatically check `/health` endpoint. This endpoint:
- Returns `status: ok`
- Verifies Canton connectivity
- Returns Canton version

## Database Schema

All tables created via `run_migrations.py`:
- `users` — User accounts for referrals
- `referrals` — Referral relationships
- `participants` — Canton party participants
- `contributions` — XP-earning contributions
- `xp_events` — XP transaction log
- `campaigns` — Campaign definitions
- `campaign_participants` — Campaign enrollments
- `campaign_payouts` — Payout records

## Notes

- Canton Ledger API must be accessible from Railway (public URL or Railway-to-Railway network)
- Splice Validator API must be accessible for Party ID allocation
- PostgreSQL is managed by Railway (automatic backups)
- Health check timeout is 300s to allow Canton connection
