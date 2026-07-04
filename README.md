# Smile CC Wallet — Canton Network Wallet for CC Tokens

> **A lightweight, privacy-first CC token wallet built on Canton DevNet. Generate real Canton party IDs, view CC token UTXOs, and verify your identity on the CC Explorer.**

**Stack**: Next.js 14 + FastAPI + PostgreSQL · **Network**: Canton DevNet · **License**: MIT

[![Frontend](https://img.shields.io/badge/Frontend-smile--cc--wallet.vercel.app-blue)](https://smile-cc-wallet.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Railway-purple)](https://smile-backend-production-e683.up.railway.app/health)
[![DevNet](https://img.shields.io/badge/Canton-DevNet-green)](https://devnet.ccexplorer.io)

---

## What is Smile CC Wallet?

Smile CC Wallet lets anyone on Canton DevNet:

- **Generate a real Canton party ID** — allocated via GINIE-VALIDATOR on Canton DevNet
- **View CC token UTXOs** — query live contract state from the Canton Ledger API
- **Send & Receive CC tokens** — exercise Daml choices via the JSON API
- **Verify on CC Explorer** — every party links directly to `devnet.ccexplorer.io`
- **Connect an existing party** — paste any party ID from CC Explorer to connect

No seed phrases. No browser extensions. Just a Canton party ID backed by the Global Synchronizer.

---

## Live URLs

| Service | URL |
|---|---|
| **Wallet** | https://smile-cc-wallet.vercel.app |
| **Backend API** | https://smile-backend-production-e683.up.railway.app |
| **API Docs** | https://smile-backend-production-e683.up.railway.app/docs |
| **CC Explorer** | https://devnet.ccexplorer.io |

---

## Architecture

```
Browser (Next.js 14)
  app/wallet/page.tsx  ←→  app/api/participants/*
                       ←→  app/api/canton/*
         │ HTTPS
FastAPI Backend (Railway)
  /participants/register  →  allocate Canton party
  /participants           →  list participants
  /health                 →  connectivity check
         │
   ┌─────┴──────┐
PostgreSQL    Canton Ledger API
(Railway)     100.49.52.241:7575
              POST /v2/parties
              POST /v2/users
```

---

## Project Structure

```
Canton_Streams_RewardApp/
│
├── canton-frontend/              # Next.js 14 wallet UI
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── wallet/page.tsx       # Wallet (party, assets, send, receive tabs)
│   │   └── api/
│   │       ├── participants/     # Proxy → backend /participants
│   │       └── canton/           # Proxy → Canton Ledger API
│   ├── components/v2/            # Navigation + Footer
│   ├── contexts/WalletContext.tsx
│   └── env.example
│
├── backend/                      # FastAPI backend
│   ├── app/
│   │   ├── main.py               # FastAPI app entry point
│   │   ├── config.py             # Env var settings
│   │   ├── clients/canton_client.py   # Canton + Validator API client
│   │   ├── routes/
│   │   │   ├── health.py
│   │   │   ├── canton.py
│   │   │   ├── parties.py
│   │   │   └── participants.py
│   │   ├── services/
│   │   │   ├── participant_service.py
│   │   │   └── canton_query_service.py
│   │   └── migrations/001_initial.sql
│   ├── Dockerfile
│   ├── railway.json
│   └── requirements.txt
│
└── README.md
```

---

## Quick Start (Local)

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18+ |
| Python | 3.11+ |
| PostgreSQL | 14+ |

### 1. Clone

```bash
git clone https://github.com/BlockX-AI/Canton_Streams_RewardApp
cd Canton_Streams_RewardApp
```

### 2. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Edit .env — set DATABASE_URL, CANTON_LEDGER_API_URL, etc.
python run_migrations.py
uvicorn app.main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs`

### 3. Frontend

```bash
cd canton-frontend
npm install
# Edit .env.local — set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Wallet at `http://localhost:3000/wallet`

---

## Environment Variables

### Backend (`.env`)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `CANTON_LEDGER_API_URL` | Canton JSON Ledger API | `http://100.49.52.241:7575` |
| `CANTON_VALIDATOR_API_URL` | Splice Validator API | `http://100.49.52.241:80` |
| `CANTON_ADMIN_TOKEN` | Validator admin JWT | `devnet-no-auth` |
| `CANTON_NAMESPACE` | Validator namespace fingerprint | `1220f42cea...` |
| `CORS_ORIGINS` | Allowed frontend origins | `https://smile-cc-wallet.vercel.app` |

### Frontend (`.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL |
| `NEXT_PUBLIC_CANTON_LEDGER_URL` | Canton Ledger API for direct queries |

---

## How Party Generation Works

```
User clicks "Generate Party"
        ↓
POST /participants/register { display_name, x_handle }
        ↓
FastAPI → POST /v2/parties { partyIdHint, displayName, userId }
        ↓
Canton allocates: x_handle::1220f42cead6c3bf...
        ↓
FastAPI → POST /v2/users { id: x_handle, primaryParty }
        ↓
Save to PostgreSQL → return party_id → stored in localStorage
        ↓
CC Explorer indexes party within 10–20 minutes
```

Every party is a **real Canton DevNet party** registered with the Global Synchronizer via GINIE-VALIDATOR.

---

## API Reference

### `GET /health`

```json
{ "status": "ok", "canton_connected": true }
```

### `POST /participants/register`

Request:
```json
{ "display_name": "Alice", "x_handle": "alice_canton", "track": "BOTH" }
```

Response:
```json
{
  "id": 1,
  "wallet": "alice_canton::1220f42cead6c3bf...",
  "x_handle": "alice_canton",
  "display_name": "Alice"
}
```

### `GET /participants`

Returns list of all registered participants.

---

## Verifying Your Party on CC Explorer

After generating a party, click **"Verify on CC Explorer"** in the wallet UI, or visit:

```
https://devnet.ccexplorer.io/parties/<YOUR_PARTY_ID>
```

> Parties appear on CC Explorer within **10–20 minutes** of registration.

---

## Deployment

### Frontend → Vercel

```bash
cd canton-frontend
vercel --prod
```

Set `NEXT_PUBLIC_API_URL` in Vercel project environment settings.

### Backend → Railway

```bash
cd backend
railway up --service smile-backend
```

Railway uses the `Dockerfile`. Set all env vars in the Railway dashboard.

---

## Canton DevNet Details

| Resource | Value |
|---|---|
| Validator | GINIE-VALIDATOR |
| Ledger API | `http://100.49.52.241:7575` |
| Validator API | `http://100.49.52.241:80` |
| Namespace | `1220f42cead6c3bf0443af1f0e51ee250afb48ee528756945ee2733cbfef62c10986` |
| CC Explorer | https://devnet.ccexplorer.io |

---

## References

| Resource | URL |
|---|---|
| Canton App Dev Docs | https://docs.digitalasset.com/build/3.4/overview/introduction.html |
| JSON Ledger API | https://docs.digitalasset.com/build/3.4/tutorials/json-api |
| Splice Validator API | https://docs.dev.sync.global/app_dev/validator_operator/index.html |
| CC Explorer DevNet | https://devnet.ccexplorer.io |
| Canton Quickstart | https://github.com/digital-asset/cn-quickstart |

---

**Version**: 1.0.0 · **Network**: Canton DevNet · **Last Updated**: July 2026
