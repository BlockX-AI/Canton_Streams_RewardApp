# GrowStreams — Canton Streams Reward App
## Complete Project Documentation

**Network:** Canton DevNet (`100.49.52.241:7575`)  
**Validator:** GINIE-VALIDATOR  
**Backend:** FastAPI on `localhost:8000`  
**Frontend:** Next.js 16 on `localhost:3000`  
**Daml SDK:** 3.4.11 (DPM)  
**Canton Version:** 3.5.1-snapshot (DevNet live)

---

## 1. DevNet Setup — Full Status ✅

Everything is live and connected. All tasks from the original blueprint are complete.

| Task | Status |
|---|---|
| Backend config pointing to DevNet (`100.49.52.241:7575`) | ✅ Done |
| GINIE-VALIDATOR party ID in `.env` | ✅ Done |
| Backend CORS fixed (comma-separated string → list) | ✅ Done |
| Backend running, connected to DevNet ledger API | ✅ Done |
| Frontend running on `localhost:3000` | ✅ Done |
| Dashboard page (`/dashboard`) with DevNet status | ✅ Done |
| API utility (`lib/api.ts`) centralised | ✅ Done |
| Daml contracts compiled → `growstreams-featured-1.0.0.dar` | ✅ Done |
| DAR uploaded to DevNet via `/canton/packages/upload` | ✅ Done |
| Contracts CC-native — `CCSettlement` (CIP-56) on all money-movement choices across all 3 stream types | ✅ Done |
| Mandatory `FeaturedAppActivityRecord` on every settlement in all contracts (CIP-0047) | ✅ Done |
| VestingStream: GrowToken → CCSettlement + FeaturedAppActivity on VestingWithdraw + VestingStop | ✅ Done |
| MilestoneStream: GrowToken → CCSettlement + FeaturedAppActivity on Confirm/Refund/ForceRefund | ✅ Done |
| StreamPool.PausePool: per-member FeaturedAppActivity records in settlement loop | ✅ Done |
| Canton wallet integration — `useCantonWallet` + `WalletModal` (CIP-103) | ✅ Done |
| `@canton-network/wallet-sdk` installed and wired | ✅ Done |
| All 33 Daml tests passing | ✅ Done |

**Live backend health:**
```json
{
  "status": "ok",
  "canton_reachable": true,
  "canton_version": "3.5.1-snapshot.20260513.18867.0",
  "env": "devnet"
}
```

---

## 2. Architecture Overview

```
Browser (Canton Wallet Extension — optional)
         ↓  window.canton / CIP-103
Frontend (Next.js 16, localhost:3000)
         ↓  HTTP fetch
Backend (FastAPI, localhost:8000)
         ↓  HTTP JSON API (v2)
Canton DevNet Ledger (100.49.52.241:7575)
         ↓
GINIE-VALIDATOR Participant Node
         ↓
Canton Global Synchronizer (DevNet)
```

**Transaction flow when a stream is withdrawn:**
```
User clicks "Claim" in Dashboard
  → Frontend calls POST /streams/{id}/withdraw?party=...
  → Backend submits Withdraw choice via Ledger API
  → Daml: CCSettlement contract created (CIP-56 settlement record)
  → Daml: FeaturedAppActivityRecord created (CIP-0047 activity marker)
  → Transaction committed to DevNet
  → Backend returns transaction offset
  → Frontend shows Cantonscan link
```

---

## 3. Backend — Full Feature Analysis

### 3.1 Technology Stack

| Layer | Tech |
|---|---|
| Framework | FastAPI (Python 3.12) |
| Settings | pydantic-settings, `.env` file |
| Canton Client | `httpx` async HTTP client |
| Error handling | Custom typed exceptions → structured JSON |
| Request IDs | Middleware injects `X-Request-ID` on every request |
| Database | Optional PostgreSQL (disabled → demo mode active) |
| API Docs | Auto-generated Swagger at `localhost:8000/docs` |

### 3.2 Configuration (`backend/app/config.py`)

All settings loaded from `.env`:

| Variable | Current Value | Purpose |
|---|---|---|
| `CANTON_LEDGER_API_URL` | `http://100.49.52.241:7575` | DevNet HTTP JSON API |
| `CANTON_USER_ID` | `GINIE-VALIDATOR` | Participant user |
| `CANTON_PACKAGE_ID` | `054d83ae7849878d487d4522881260c5aa599c4c25244040232251cd0c3b5b9c` | Daml package hash |
| `CANTON_ADMIN_PARTY` | `PAR::GINIE-VALIDATOR::1220f42c...` | Main party on DevNet |
| `APP_ENV` | `devnet` | Environment flag |
| `DATABASE_URL` | _(empty)_ | DB disabled → demo data active |
| `CORS_ORIGINS` | `localhost:3000,localhost:5173,192.168.1.4:3000` | Allowed frontends |

**Demo mode:** When `DATABASE_URL` is empty every route returns realistic hardcoded data. Connect PostgreSQL and it switches to live queries automatically — no code changes needed.

### 3.3 All API Routes

#### `/health` — System Health
```
GET /health
```
- `canton_reachable` — live ping to `100.49.52.241:7575`
- `canton_version` — SDK version string from DevNet
- `env` — devnet / local / testnet
- `timestamp` + `request_id`

---

#### `/canton/*` — Direct Canton Operations
```
GET  /canton/version              — Canton SDK version
GET  /canton/ledger-end           — Current ledger offset
GET  /canton/packages             — List deployed package IDs
POST /canton/packages/upload      — Upload a .dar file to DevNet
```
Admin-level endpoints. `/canton/packages/upload` is used to push a compiled `.dar` to the DevNet ledger. Confirmed: `growstreams-featured-1.0.0.dar` uploaded successfully (HTTP 200).

---

#### `/parties` — Party Management
```
GET /parties               — List all parties from DevNet ledger
GET /parties/{party_id}    — Get single party info
```
Fetches real data from `100.49.52.241:7575/v2/parties`. Returns live DevNet party list.

---

#### `/participants` — Campaign Participant Registry
```
POST /participants                   — Register new participant
GET  /participants/{wallet}          — Get participant profile
GET  /participants/{wallet}/stats    — XP, rank, estimated CC reward
```
Demo: 5 preset participants; unknown wallet → 500 XP / rank 50 default.  
With DB: reads from `participants` table in PostgreSQL.

---

#### `/tokens` — GrowToken Engagement Layer
```
GET  /tokens?party=...      — List GROW tokens held by party
POST /tokens/mint           — Mint GROW tokens (admin)
POST /tokens/transfer       — Transfer between parties
```
`GrowToken` remains as the **XP/engagement token** for campaigns and leaderboard tracking. Settlement (the actual money movement) has moved to `CCSettlement` in the Daml contracts. These routes return demo data for now.

---

#### `/streams` — Core Streaming Protocol
```
POST /streams                        — Create a new stream via StreamFactory
GET  /streams?party=...              — List all streams for a party
GET  /streams/{contract_id}?party=   — Get single stream state
POST /streams/{contract_id}/withdraw — Claim all accrued CC
POST /streams/{contract_id}/pause    — Pause an active stream
POST /streams/{contract_id}/resume   — Resume a paused stream
POST /streams/{contract_id}/cancel   — Terminate stream (refunds sender)
POST /streams/{contract_id}/top-up   — Add more CC to stream balance
```
**This is the core product.** Each stream is a `StreamAgreement` Daml contract. Accrual formula:
```
accrued = (ledger_time_now − last_settled) × rate_per_second
```
`Withdraw` executes the Daml `Withdraw` choice: creates a `CCSettlement` record + `FeaturedAppActivityRecord`, then updates `lastSettled = now`.

`POST /streams` body: `{factory_contract_id, sender_party, receiver_party, flow_rate, initial_deposit}`

---

#### `/lp-pools` — Pool Streaming (1-to-N Distribution)
```
GET  /lp-pools?party=...               — List StreamPool contracts
POST /lp-pools/{id}/withdraw-share     — Member withdraws their accrued CC share
POST /lp-pools/{id}/pause             — Admin pauses pool + settles all members
POST /lp-pools/{id}/resume            — Admin resumes paused pool
POST /lp-pools/{id}/add-member        — Admin adds a new member with unit weight
```
One sender → many recipients, each weighted by `units` share. Per-member `lastUpdate` timestamps prevent cross-member interference. `PausePool` now creates `FeaturedAppActivityRecord` for every settled member.

---

#### `/billing` — SaaS / Metered Billing Streams
```
GET  /billing?party=...   — List billing streams
POST /billing             — Create new billing stream
```
Streams for node fees and SaaS subscriptions. Pause when inactive, resume on activity.

---

#### `/vesting` — VestingStream Contracts
```
GET  /vesting?party=...         — List vesting schedules
POST /vesting/{id}/withdraw     — Claim linearly vested CC (creates CCSettlement + FeaturedAppActivity)
POST /vesting/{id}/stop         — Sender cancels vesting, reclaims unvested CC (creates CCSettlement + FeaturedAppActivity)
```
Maps to `VestingStream.daml`. Cliff time enforces early-withdrawal block; linear unlock after cliff. Both `VestingWithdraw` and `VestingStop` now emit `CCSettlement` + `FeaturedAppActivityRecord` (fixed from GrowToken stub).

---

#### `/subscriptions` — Subscription Management
```
GET  /subscriptions?party=...    — List subscriptions
POST /subscriptions              — Create subscription stream
POST /subscriptions/{id}/renew  — Renew
POST /subscriptions/{id}/cancel — Cancel
```

---

#### `/milestones` — Milestone-Based Streams
```
GET  /milestones?party=...         — List milestone streams
POST /milestones/{id}/confirm      — Admin confirms milestone → CCSettlement + FeaturedAppActivity
POST /milestones/{id}/release      — Sender claims remaining deposit (all milestones done)
POST /milestones/{id}/cancel       — Force refund by sender + admin co-auth
```
Maps to `MilestoneStream.daml`. All three money-movement choices now emit `CCSettlement` + `FeaturedAppActivityRecord`. Fixed from GrowToken stub — the Canton DVP pattern is now complete.

---

#### `/campaigns` — Campaign System
```
GET  /campaigns                       — List all campaigns (paginated)
GET  /campaigns/active                — Active campaigns only
GET  /campaigns/{id}                  — Campaign detail
POST /campaigns                       — Create campaign
POST /campaigns/{id}/fund            — Fund with CC
POST /campaigns/{id}/enroll          — Enroll participant
GET  /campaigns/{id}/leaderboard     — Per-campaign XP leaderboard
GET  /campaigns/{id}/payout-preview  — Preview CC payout per participant
```
Demo: 5 preset campaigns — Canton Developer Quest, Content Creator Challenge, Privacy Protocol Season 1, CCTools Integration, DeFi Builder Grants. All use `CC` as reward token.

Campaign lifecycle: `FUNDED → ACTIVE → ENDED`  
Track types: `OSS`, `CONTENT`, `BOTH`

---

#### `/leaderboard` — Global XP Rankings
```
GET /leaderboard             — All participants ranked by XP
GET /leaderboard?track=OSS   — Filter by track type
GET /leaderboard/stats       — Aggregate stats
```
Demo stats: 336 participants · 53,380 total XP · 40,000 CC pool · 1,247 contributions.

---

#### `/rewards` — Featured App Activity & CC Revenue Projections
```
GET /rewards/activity?party=...                    — List all FeaturedAppActivityRecord contracts
GET /rewards/summary?party=...&monthly_txn_estimate=N — CC revenue projection
```
Queries `FeaturedAppActivityRecord` contracts from the Canton ledger. `/rewards/summary` computes:
- `network_share_pct` = your txns ÷ 40M network txns/month
- `estimated_monthly_cc` = share × 516M CC rewards pool
- `estimated_monthly_usd` = CC × $0.1546

`featured_app_ready: false` until splice-amulet.dar is wired and Tokenomics Committee approval received.

---

#### `/demo` — Demo Utilities
```
POST /demo/reset    — Reset demo state
GET  /demo/status   — Demo data status
```
Only active when `ENABLE_DEMO_ENDPOINTS=true`.

### 3.4 Error Handling

All errors return structured JSON:
```json
{
  "error": {
    "code": "CONTRACT_NOT_FOUND",
    "message": "Human-readable description",
    "request_id": "uuid",
    "details": {}
  }
}
```

| Exception | HTTP Status |
|---|---|
| `CantonUnavailableError` | 503 |
| `CantonError` | 400 / 422 / 409 |
| `ContractNotFoundError` | 404 |
| `ValueError` | 422 |
| Unhandled | 500 |

---

## 4. Frontend — Full Feature Analysis

### 4.1 Technology Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16.1.1 (App Router + Turbopack) |
| Language | TypeScript 5 |
| Styling | TailwindCSS 4 |
| Animations | `motion/react` (Framer Motion 12) + GSAP 3 |
| Icons | Lucide React |
| Theming | `next-themes` (dark default) |
| Shaders | Custom WebGL via `ogl` |
| Smooth scroll | `lenis` |
| Canton Wallet | `@canton-network/wallet-sdk` v1.3.1 |
| Fonts | Geist Sans + Geist Mono (Variable) |

### 4.2 Design System

**Color Palette:**

| Token | Dark Value | Role |
|---|---|---|
| `background` | `#0a0a0a` | Page background |
| `foreground` | `#fafafa` | Primary text |
| `muted` | `#171717` | Card / surface |
| `border` | `#262626` | Dividers |
| cyan-400 | `#22d3ee` | Streams, CTA, wallet connected |
| emerald-400 | `#34d399` | Live / connected states |
| purple-400 | `#c084fc` | OSS track, gradients |
| amber-300 | `#fcd34d` | Rank #1 highlight |

**Typography:**
- Heading: Geist Sans Variable, `clamp(2rem, 4.2vw, 4rem)`, `tracking-tight`
- Body: Geist Sans, `text-white/60`, `leading-relaxed`
- Mono labels: Geist Mono, `text-xs uppercase tracking-widest`
- Addresses / numbers: `font-mono text-sm break-all`

**Animation:**
- Easing: `[0.33, 1, 0.68, 1]` (easeOutExpo) used throughout
- Entry: `{ opacity: 0, y: 20 } → { opacity: 1, y: 0 }`, staggered by delay
- Scroll: GSAP `ScrollTrigger` pins ValueProp; `lenis` for smooth kinetics
- WebGL shaders: hero background + value prop wave (both via `ogl`)

### 4.3 Global State — Wallet Context

Wallet state is shared globally across all pages via a React context:

```
WalletProvider (in Providers.tsx)
  ↓
useWallet() hook — available anywhere in the app
  ↓
  status: "idle" | "no_extension" | "connecting" | "connected" | "error"
  partyId: string | null
  extensionFound: boolean
  connect()      — calls SDK.create({ ledgerProvider: window.canton })
  disconnect()
  setManualParty(id) — manual DevNet testing fallback
```

Party ID is persisted in `localStorage` under key `gs_party_id`. On page load the hook reads it and restores the connected state without a re-connect.

### 4.4 Page-by-Page Breakdown

---

#### `/` — Landing Page

Full-screen marketing page with seven sections:

1. **HeroNew** — Pill (110×60px) expands to full screen (1.8s). WebGL shader background. Headline: "Institutional payment streams." Two CTAs: View Campaigns, Claim Rewards.

2. **ValueProp** — GSAP scroll-pinned. 3 step cards with word-by-word reveal. Wave shader morphs per step (hue + amplitude).

3. **Product** — 3 edge-to-edge tiles. Smart Contracts · Regulated Assets · Privacy First. Lucide icons: `Workflow`, `Boxes`, `Sparkles`.

4. **Pillars** — 3-column grid: Compliance · Privacy · Automation. Featured card + 2 ghost cards with hover.

5. **FAQ** — Collapsible accordion.

6. **FinalCTA** — Bottom CTA.

7. **Footer** — "Build on Canton. Stream every obligation." 3 link columns.

---

#### `/dashboard` — DevNet Dashboard

Live backend connection. Uses `useWallet()` for party state.

- **Status header** — cyan pill: `● DevNet` (pulsing) / `○ Offline`
- **4 stat cards** — Active Campaigns · Total CC Pool · Participants · Canton Version
- **Canton Party panel:**
  - If connected: shows party ID + "Refresh Streams" button
  - If not: "Connect Wallet" button → opens `WalletModal`
  - "Manage" link → reopens modal to disconnect / switch party
- **Active Streams list:**
  - `GET /streams?party={id}` on connect + on refresh
  - Each stream row: stream ID, status badge, accrued CC, rate/s, total withdrawn
  - "Claim" button → `POST /streams/{id}/withdraw` → shows result inline
  - Empty state message with deploy instructions when no streams
- **DevNet info panel** — validator, ledger API, network, Cantonscan link
- **Active Campaigns sidebar** — 4 latest with CC pool, track badge, enroll link

---

#### `/campaigns` — Campaign Browser

`GET /campaigns` on mount.

- Table: name, category badge, flow rate, CC distributed %, "Open App" button
- Status badge colours: purple=OSS, pink=Social, cyan=DeFi, amber=Grants
- Loading skeleton + empty state

---

#### `/campaigns/[id]` — Campaign Detail

`GET /campaigns/{id}` + `GET /campaigns/{id}/leaderboard`.

- Status + track badges, headline, stats bar (pool, participants, XP, end date)
- **Join panel** (ACTIVE only): wallet input → `POST /campaigns/{id}/enroll`
- **Leaderboard**: rank badge, avatar, name, XP, estimated CC

---

#### `/leaderboard` — Global Rankings

`GET /leaderboard` + `GET /leaderboard/stats`.

- 4 stat cards
- Track filter: All | OSS | Content
- Table: rank circle (amber/silver/bronze top 3), avatar, name, track badge, XP

---

#### `/claim` — Rewards Claim

Uses `useWallet()` — party ID auto-fills from connected wallet.

- **Connect Wallet** button in header (shown when not connected)
- Party ID input auto-populated from `partyId` context value
- `GET /participants/{wallet}/stats` → XP, rank, estimated CC
- **Claim Rewards** flow:
  1. `GET /streams?party=...` — check if streams exist
  2. If yes → `POST /streams/{id}/withdraw` → shows **Cantonscan transaction link**
  3. If no streams → shows "XP recorded, deploy a stream to claim CC" message with Dashboard link
- Cantonscan DevNet explorer: `https://scan.sv-2.dev.global.canton.network.digitalasset.com`

---

#### Navigation (`Nav`)

- Fixed header, blur backdrop, scroll-reactive border
- Left: GrowStreams logo + "Canton" badge
- Centre: Protocol, Features, FAQ links + Campaigns, Leaderboard, Claim
- Right (desktop): **Dashboard** pill + **Connect Wallet** button
  - When connected: green pulse dot + truncated party ID (first 16 chars)
  - When disconnected: "Connect Wallet" with white/10 border
- Mobile: hamburger → drawer with same links + wallet button

### 4.5 Wallet Modal (`WalletModal`)

Animated full-screen overlay. Two tabs:

**Canton Wallet tab:**
- If `window.canton` detected: "Connect Wallet" button → `SDK.create({ ledgerProvider: window.canton })` → `sdk.party.list()`
- If no extension: install cards for 4 wallets:
  - 🟡 Bron Wallet — mobile + extension
  - 🌙 Nightly — browser extension
  - ⌨️ Console Wallet — web wallet, no install
  - 🔐 C8 Wallet — hardware-backed

**Manual / DevNet tab:**
- Textarea for party ID
- "DevNet" shortcut button auto-fills GINIE-VALIDATOR party
- "Connect Party" saves to `localStorage` + updates global context

**Connected state:** shows party ID, "Open Dashboard" + "Disconnect" buttons.

### 4.6 Component Library

| Component | Purpose |
|---|---|
| `Nav` | Fixed header, wallet button, mobile drawer |
| `WalletModal` | Wallet connect / manual entry overlay |
| `HeroNew` | Animated pill-to-fullscreen hero + WebGL |
| `ValueProp` | GSAP scroll-pinned 3-step narrative |
| `Product` | 3-tile feature section |
| `Pillars` | 3-column platform pillars |
| `Faq` | Collapsible accordion |
| `FinalCta` | Bottom CTA |
| `Footer` | Links + status |
| `ShaderCanvas` | WebGL background (ogl) |
| `WaveShader` | Parameterised wave animation |
| `ArrowChip` | Diagonal arrow button chip |
| `Providers` | Theme + WalletProvider + MotionConfig |
| `SmoothScroll` | Lenis setup |

### 4.7 Shared Utilities (`lib/`)

| File | Exports |
|---|---|
| `lib/api.ts` | `fetchHealth`, `fetchCampaigns`, `fetchLeaderboardStats`, `fetchStreams`, `fetchParticipantStats` — all typed, all use `NEXT_PUBLIC_API_URL` |
| `lib/useCantonWallet.ts` | `useCantonWallet()` hook — extension detection, SDK connect, manual fallback, localStorage persist |
| `lib/wallet-context.tsx` | `WalletProvider` + `useWallet()` — global context wrapping the hook |
| `lib/motion.ts` | `ReducedMotionProvider` |
| `lib/metadata.ts` | Base Next.js metadata |

---

## 5. Daml Contracts — CC-Native (Updated)

Seven contracts in `daml-contracts/daml/`:

| Contract | Role | Settlement |
|---|---|---|
| `GrowToken` | XP engagement token — campaigns, leaderboard | Transfer / split / merge (stays as engagement layer) |
| `StreamAgreement` | Core stream: continuous CC payment | `CCSettlement` (CIP-56) on every Withdraw / UpdateRate / Pause / Stop |
| `StreamFactory` | Creates `StreamAgreement` with auto IDs | — |
| `StreamProposal` | Two-party propose-accept flow | No token deposit required |
| `StreamPool` | 1-to-N weighted CC distribution | `CCSettlement` on WithdrawMember / PausePool |
| `VestingStream` | Cliff + linear unlock | `CCSettlement` on VestingWithdraw + VestingStop |
| `MilestoneStream` | Admin-confirmed tranche release | `CCSettlement` on ConfirmMilestone, RefundRemaining, ForceRefund |
| `FeaturedAppActivityRecord` | CIP-0047 activity marker | Created on every settlement |
| `CCSettlement` | CIP-56 placeholder settlement record | Created on every money movement |

### 5.1 CCSettlement (CIP-56 Placeholder)

```daml
template CCSettlement
  with
    payer    : Party
    receiver : Party
    amount   : Decimal
    symbol   : Text      -- always "CC"
    streamId : Int
    reason   : Text      -- "stream_withdraw" | "pause_settle" | etc.
  where
    signatory payer
    observer  receiver
    ensure amount > 0.0 && symbol == "CC"
```

When `splice-amulet.dar` is available, replace with `Splice.Amulet.AmuletRules.Transfer`.

### 5.2 FeaturedAppActivityRecord (CIP-0047)

Created automatically on **every** settlement event:

| Choice | Activity Type |
|---|---|
| `StreamAgreement.Withdraw` | `stream_withdraw` |
| `StreamAgreement.UpdateRate` | `rate_update_settle` |
| `StreamAgreement.Pause` | `pause_settle` |
| `StreamAgreement.Stop` | `stream_stop_final` |
| `StreamFactory.CreateStream` | `stream_created` |
| `StreamPool.WithdrawMember` | `pool_withdraw` |
| `StreamPool.PausePool` | `pool_pause_settle` (one record per settled member) |
| `VestingStream.VestingWithdraw` | `vesting_withdraw` |
| `VestingStream.VestingStop` | `vesting_stop` |
| `MilestoneStream.ConfirmMilestone` | `milestone_confirm` |
| `MilestoneStream.RefundRemaining` | `milestone_refund` |
| `MilestoneStream.ForceRefund` | `milestone_force_refund` |

**Authorization note:** Provider = `admin` where admin is controller/signatory (MilestoneStream choices, StreamPool choices, StreamFactory). Provider = `sender` where sender is the available signatory (StreamAgreement choices, VestingStream choices). When `splice-amulet.dar` is wired, all providers should be the GrowStreams admin operator party.

### 5.3 Accrual Formula

```
accrued = (ledger_time_now − last_settled) × rate_per_second
capped  = min(accrued, deposited − withdrawn)
```

### 5.4 Privacy Model

- `sender` — signatory, full control (pause/cancel)
- `receiver` — signatory, can withdraw
- Any party not listed — sees **nothing** (Canton privacy enforced at ledger level)
- `admin` — additional signatory in `StreamFactory` / `StreamPool`

### 5.5 Test Coverage

```
33 / 33 passing
```

| Suite | Tests | Status |
|---|---|---|
| `GrowTokenTest` | 8 | ✅ all ok |
| `StreamCoreTest` | 6 | ✅ all ok |
| `StreamPoolTest` | 4 | ✅ all ok |
| `UpdateRateTest` | 3 | ✅ all ok |
| `VestingStreamTest` | 4 | ✅ all ok |
| `MilestoneStreamTest` | 4 | ✅ all ok |
| `SeedLedger` | 1 | ✅ ok |

Run tests:
```bash
cd Canton_Streams_RewardApp/daml-contracts-tests
export PATH="$HOME/.dpm/bin:$PATH" && dpm test
```

---

## 6. DAR Build & Deployment

### Build
```bash
cd Canton_Streams_RewardApp/daml-contracts
export PATH="$HOME/.dpm/bin:$PATH"
dpm build
# → .daml/dist/growstreams-featured-1.0.0.dar
```

### Upload to DevNet
```bash
curl -X POST http://localhost:8000/canton/packages/upload \
  -F "file=@.daml/dist/growstreams-featured-1.0.0.dar"
# → {"ok": true, "result": {}}
```

**Status:** `growstreams-featured-1.0.0.dar` is uploaded to DevNet GINIE-VALIDATOR as of May 23 2026. It is deployed under a new package name because Canton package upgrade checks do not allow changing existing choice return types.

### Verify packages on ledger
```bash
curl http://localhost:8000/canton/packages
```

---

## 7. What Remains (Lower Priority)

| Item | Why |
|---|---|
| **Apply for Featured App status** | Email `operations@sync.global` — DevNet is live, self-feature through wallet UI to test reward mechanics immediately |
| Deploy to Canton **TestNet** | Get a public contract ID for grant milestone submission |
| Replace `CCSettlement` with `Splice.Amulet` | When DA publishes `splice-amulet.dar` via DPM — replace stub in all contracts |
| Connect PostgreSQL | Switch from demo data to real persistent participant + XP storage |
| Wallet test with real extension | Verify `SDK.create({ ledgerProvider: window.canton })` end-to-end once Bron/Nightly supports DevNet |
| Rebuild + re-upload DAR | Contract changes require `dpm build` → `POST /canton/packages/upload` → re-create factory contracts |

---

## 8. Running the App

### Backend
```bash
cd Canton_Streams_RewardApp/backend
source ../.venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd Canton_Streams_RewardApp/canton-frontend
npm run dev
# → http://localhost:3000
```

### Build Daml contracts
```bash
cd Canton_Streams_RewardApp/daml-contracts
export PATH="$HOME/.dpm/bin:$PATH" && dpm build
```

### Run all Daml tests
```bash
cd Canton_Streams_RewardApp/daml-contracts-tests
export PATH="$HOME/.dpm/bin:$PATH" && dpm test
```

### Verify DevNet connection
```bash
curl http://localhost:8000/health
# "canton_reachable": true
```

### Swagger API docs
```
http://localhost:8000/docs
```

---

## 9. Key Files Reference

| File | Purpose |
|---|---|
| `backend/app/main.py` | FastAPI app, lifespan, CORS, error handlers, router registration |
| `backend/app/config.py` | All settings from `.env` (DevNet credentials, CORS, DB) |
| `backend/app/clients/canton_client.py` | `httpx` Canton Ledger API client |
| `backend/app/routes/*.py` | 15 route modules (added `rewards.py`) |
| `backend/app/services/rewards_service.py` | FeaturedAppActivity query + CC revenue projection |
| `backend/app/models/rewards.py` | `ActivityRecordView`, `RewardsSummaryView` Pydantic models |
| `canton-frontend/app/page.tsx` | Landing page assembly |
| `canton-frontend/app/dashboard/page.tsx` | DevNet dashboard (streams, wallet, stats) |
| `canton-frontend/app/campaigns/page.tsx` | Campaign browser |
| `canton-frontend/app/campaigns/[id]/page.tsx` | Campaign detail + leaderboard |
| `canton-frontend/app/leaderboard/page.tsx` | Global XP rankings |
| `canton-frontend/app/claim/page.tsx` | Claim flow — wallet-connected, Cantonscan links |
| `canton-frontend/lib/api.ts` | Typed API fetch utility |
| `canton-frontend/lib/useCantonWallet.ts` | CIP-103 wallet hook (`window.canton` + manual fallback) |
| `canton-frontend/lib/wallet-context.tsx` | Global `WalletProvider` + `useWallet()` |
| `canton-frontend/components/nav.tsx` | Nav with Connect Wallet button + wallet status |
| `canton-frontend/components/wallet-modal.tsx` | Wallet modal — extension detect, install cards, manual entry |
| `canton-frontend/components/providers.tsx` | Root providers including `WalletProvider` |
| `daml-contracts/daml/StreamCore.daml` | `StreamAgreement`, `StreamFactory`, `StreamProposal`, `CCSettlement` |
| `daml-contracts/daml/StreamPool.daml` | `StreamPool`, `PoolFactory` — CC-native with CCSettlement |
| `daml-contracts/daml/FeaturedAppActivity.daml` | `FeaturedAppActivityRecord` (CIP-0047 stub) |
| `daml-contracts/daml/GrowToken.daml` | GROW engagement token (engagement layer only) |
| `daml-contracts/daml/VestingStream.daml` | Cliff + linear vesting |
| `daml-contracts/daml/MilestoneStream.daml` | Admin-confirmed milestone tranches |
| `daml-contracts/.daml/dist/growstreams-featured-1.0.0.dar` | Compiled DAR — uploaded to DevNet |
| `.env` | DevNet credentials (backend config) |
| `multi-package.yaml` | DPM multi-package project definition |

---

## 10. DevNet Quick Reference

| Item | Value |
|---|---|
| Ledger API (HTTP JSON) | `http://100.49.52.241:7575` |
| Ledger API (gRPC) | `100.49.52.241:5001` |
| Validator party | `PAR::GINIE-VALIDATOR::1220f42cead6c3bf0443af1f0e51ee250afb48ee528756945ee2733cbfef62c10986` |
| Canton package ID | `054d83ae7849878d487d4522881260c5aa599c4c25244040232251cd0c3b5b9c` |
| Cantonscan explorer | `https://scan.sv-2.dev.global.canton.network.digitalasset.com` |
| Daml SDK | 3.4.11 |
| Backend | `http://localhost:8000` |
| Frontend | `http://localhost:3000` |

---

*Last updated: May 23, 2026 — All contract GrowToken stubs removed · CCSettlement on all 3 stream types · FeaturedAppActivity mandatory on all 13 settlement events · StreamPool PausePool per-member activity · New API endpoints: POST /streams, POST /vesting/{id}/stop, POST /lp-pools/{id}/pause, POST /lp-pools/{id}/resume, POST /lp-pools/{id}/add-member, GET /rewards/activity, GET /rewards/summary · Ready for Featured App application + TestNet.*
