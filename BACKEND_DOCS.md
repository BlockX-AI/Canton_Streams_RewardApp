# GrowStreams Backend Documentation

> **FastAPI + Canton Ledger API + DAML Contracts**
> Complete reference for the GrowStreams Canton-native payment streaming backend.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [DAML Contracts](#3-daml-contracts)
4. [Backend Services](#4-backend-services)
5. [API Endpoints](#5-api-endpoints)
6. [Database Schema](#6-database-schema)
7. [Configuration](#7-configuration)
8. [Project Structure](#8-project-structure)
9. [Error Handling](#9-error-handling)
10. [Testing](#10-testing)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                          │
│              http://localhost:3000                                    │
└────────────────────────────┬─────────────────────────────────────────┘
                             │  REST / JSON
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Python)                          │
│              http://localhost:8000                                    │
│                                                                      │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────────────────┐  │
│  │   Routes   │→ │   Services   │→ │  Canton Client (httpx)      │  │
│  │  (REST)    │  │ (biz logic)  │  │  JSON API v2 calls          │  │
│  └────────────┘  └──────────────┘  └──────────────┬──────────────┘  │
│                         │                          │                 │
│                         ▼                          ▼                 │
│              ┌──────────────────┐     ┌────────────────────────┐    │
│              │  PostgreSQL DB   │     │  Canton Ledger API v2  │    │
│              │  (campaigns/XP)  │     │  http://localhost:7575 │    │
│              └──────────────────┘     └────────────┬───────────┘    │
└──────────────────────────────────────────────────────────────────────┘
                                                     │
                                                     ▼
                                        ┌────────────────────────┐
                                        │  Canton LocalNet       │
                                        │  DAML Smart Contracts  │
                                        │  (growstreams-featured) │
                                        └────────────────────────┘
```

**Key Design Principles:**
- **Canton is source of truth** — all on-chain state (streams, pools, tokens, vesting, milestones) lives in DAML contracts on the Canton ledger
- **FastAPI owns validation** — request validation, response normalization, and error mapping
- **PostgreSQL is optional** — only needed for off-chain features (campaigns, XP, leaderboard, participants). Without a DB, demo data is served
- **Deterministic command IDs** — every submit-and-wait call uses a SHA256-based command ID for idempotency

---

## 2. Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Language | Python | ≥ 3.11 |
| Web Framework | FastAPI | ≥ 0.115 |
| ASGI Server | Uvicorn | ≥ 0.34 |
| HTTP Client | httpx | ≥ 0.27 |
| Validation | Pydantic v2 | ≥ 2.7 |
| Settings | pydantic-settings | ≥ 2.3 |
| Database | asyncpg (PostgreSQL) | ≥ 0.29 |
| Smart Contracts | DAML | SDK 3.4.11 |
| Ledger | Canton LocalNet | JSON API v2 |
| Linting | Ruff | ≥ 0.4 |
| Type Checking | mypy | ≥ 1.10 |
| Testing | pytest + pytest-asyncio | ≥ 8.2 |

**Dependencies:** `requirements.txt`
```
fastapi>=0.115.0
uvicorn[standard]>=0.34.0
httpx>=0.27.0
pydantic>=2.7.0
pydantic-settings>=2.3.0
python-dotenv>=1.0.0
structlog>=24.2.0
asyncpg>=0.29.0
alembic>=1.13.0
python-multipart>=0.0.9
```

---

## 3. DAML Contracts

All contracts are in `daml-contracts/daml/` and compiled into a single `.dar` (DAML Archive) with SDK version `3.4.11`. Package name: `growstreams-featured`.

### 3.1 Contract Overview

| # | Module | Template(s) | Purpose |
|---|--------|-------------|---------|
| 1 | `StreamCore` | `StreamAgreement`, `StreamFactory`, `StreamProposal`, `CCSettlement` | Core per-second payment streaming |
| 2 | `StreamPool` | `StreamPool`, `PoolFactory` | 1-to-N proportional distribution pools |
| 3 | `GrowToken` | `GrowToken`, `Allowance`, `Faucet` | CC (Canton Coin) fungible token with UTXO model |
| 4 | `VestingStream` | `VestingStream`, `VestingFactory` | Cliff + linear token vesting |
| 5 | `MilestoneStream` | `MilestoneStream`, `MilestoneFactory` | Conditional escrow with admin-confirmed milestones |
| 6 | `FeaturedAppActivity` | `FeaturedAppActivityRecord`, `AppRewardCoupon` | CIP-0047 activity tracking for CC rewards |
| 7 | `HelloStream` | `SimpleStream` | Learning exercise (minimal contract) |

---

### 3.2 StreamCore — Per-Second Payment Streaming

**File:** `daml-contracts/daml/StreamCore.daml`

The core streaming contract. A `StreamAgreement` represents a continuous per-second payment from sender to receiver. The `StreamFactory` auto-increments stream IDs.

#### Templates

**`CCSettlement`** — CIP-56 compliant settlement record
```
Fields: payer, receiver, amount, symbol ("CC"), streamId, reason
Signatories: payer
Observers: receiver
Invariant: amount > 0.0 && symbol == "CC"
```

**`StreamAgreement`** — Active payment stream
```
Fields:
  streamId   : Int          — auto-incremented by factory
  sender     : Party        — funds the stream
  receiver   : Party        — withdraws accrued tokens
  admin      : Party        — co-signs critical operations
  flowRate   : Decimal      — tokens per second
  startTime  : Time
  lastUpdate : Time
  deposited  : Decimal      — total deposited
  withdrawn  : Decimal      — total withdrawn
  status     : Active | Paused | Stopped

Choices:
  Withdraw       → receiver+admin  → settles accrued, creates CCSettlement + FeaturedAppActivityRecord
  TopUp          → sender          → increases deposit
  UpdateRate     → sender+admin    → settles accrued, changes flowRate
  Pause          → sender+admin    → settles accrued, sets status=Paused
  Resume         → sender          → sets status=Active
  Stop           → sender+admin    → final settlement + refund, returns (finalAccrued, refundAmount)
  RecordActivity → admin           → non-consuming, creates FeaturedAppActivityRecord
  ObligationView → receiver        → non-consuming, returns withdrawable
  GetWithdrawable→ receiver        → non-consuming, returns withdrawable
  GetStreamInfo  → sender/receiver → non-consuming, returns (withdrawable, totalWithdrawn, status)
```

**`StreamFactory`** — Creates new streams
```
Fields: admin, nextStreamId, users
Choice: CreateStream(sender, receiver, flowRate, initialDeposit) → returns (newFactory, streamCid)
```

**`StreamProposal`** — Two-party stream creation proposal
```
Fields: proposalId, sender, receiver, flowRate, depositAmount, factoryCid
Choices: AcceptStream (receiver), CancelProposal (sender)
```

**Accrual Formula:**
```
elapsed   = (now - lastUpdate) in seconds
accrued   = flowRate × elapsed
available = deposited - withdrawn
withdrawable = min(accrued, available)
```

---

### 3.3 StreamPool — 1-to-N Distribution Pools

**File:** `daml-contracts/daml/StreamPool.daml`

A proportional reward pool where multiple members earn based on their unit allocation. Each member tracks their own `lastUpdate` independently to prevent cross-member accrual interference.

#### Templates

**`MemberState`** — Per-member tracking
```
Fields: party, units, withdrawn, lastUpdate
```

**`StreamPool`** — Active distribution pool
```
Fields:
  poolId, admin, totalRate, memberStates, totalUnits, deposited, totalWithdrawn, status

Choices:
  WithdrawMember     → member+admin   → proportional withdrawal based on units/totalUnits
  TopUpPool          → admin          → increase deposit
  AddMember          → admin          → add new member with units
  UpdateMemberUnits  → admin          → change member's units (settles accrued first)
  PausePool          → admin          → settles ALL members, pauses
  ResumePool         → admin          → refreshes all lastUpdate times
  GetMemberAccrued   → member         → non-consuming, returns member's accrued amount
```

**Per-Member Accrual:**
```
memberRate = totalRate × (member.units / totalUnits)
accrued    = memberRate × elapsed
```

**`PoolFactory`** — Creates pools
```
Choice: CreatePool(members, totalRate, deposit) → returns (newFactory, poolCid)
```

---

### 3.4 GrowToken — CC Fungible Token (UTXO Model)

**File:** `daml-contracts/daml/GrowToken.daml`

A fungible token using UTXO-style accounting. Symbol is always `"CC"` (Canton Coin) with 10 decimals.

#### Templates

**`GrowToken`** — Token holding
```
Fields: owner, issuer, amount, symbol ("CC"), decimals (10)
Invariant: amount > 0.0 && symbol == "CC" && decimals == 10

Choices:
  Transfer → owner   → send tokens to newOwner, returns (recipientToken, Optional remainderToken)
  Split    → owner   → split into two tokens
  Merge    → owner   → combine with another GrowToken (archives other)
  Burn     → owner   → destroy tokens, returns Optional remainder
  Approve  → owner   → create Allowance for spender, returns (allowanceCid, Optional remainderToken)
```

**`Allowance`** — Delegated spending authorization
```
Fields: tokenOwner, spender, amount, issuer
Choices:
  TransferFrom    → spender     → spend from allowance
  CancelAllowance → tokenOwner  → revoke
```

**`Faucet`** — Admin-only token minting (testnet)
```
Fields: admin
Choices:
  Mint      → admin → create GrowToken for recipient
  MintBatch → admin → create tokens for multiple recipients
```

---

### 3.5 VestingStream — Cliff + Linear Vesting

**File:** `daml-contracts/daml/VestingStream.daml`

Token vesting with a cliff date and linear unlock. Canton enforces the cliff on-chain — no frontend bypass possible.

**`VestingStream`**
```
Fields: vestingId, sender, receiver, admin, cliffTime, vestingEnd, totalAmount, withdrawn
Invariant: totalAmount > 0.0, withdrawn ≤ totalAmount, cliffTime < vestingEnd

Choices:
  VestedBalance    → receiver       → non-consuming, returns claimable amount
  VestingWithdraw  → receiver+admin → withdraw vested tokens, creates CCSettlement
  VestingStop      → sender+admin   → refund unvested tokens, creates CCSettlement

Vesting Formula:
  vestedFraction = min(1.0, elapsed_since_cliff / total_vesting_duration)
  totalVested    = totalAmount × vestedFraction
  withdrawable   = totalVested - withdrawn
```

**`VestingFactory`** — Creates vesting schedules
```
Choice: CreateVesting(sender, receiver, cliffTime, vestingEnd, totalAmount)
```

---

### 3.6 MilestoneStream — Conditional Escrow

**File:** `daml-contracts/daml/MilestoneStream.daml`

Escrow that releases funds per milestone when confirmed by an admin oracle. Atomic GrowToken transfer on each confirmation.

**`Milestone`** data type: `{ name: Text, amount: Decimal, done: Bool }`

**`MilestoneStream`**
```
Fields: milestoneId, sender, receiver, admin, milestones, deposited
Invariant: deposited ≥ 0.0, at least 1 milestone

Choices:
  ConfirmMilestone    → admin         → marks milestone done, transfers amount to receiver via CCSettlement
  RefundRemaining     → sender+admin  → after ALL milestones done, refund leftover deposit
  ForceRefund         → sender+admin  → emergency refund of remaining deposit
  GetPendingMilestones→ receiver/admin→ non-consuming, returns incomplete milestones
  GetTotalPending     → receiver/admin→ non-consuming, returns sum of pending amounts
```

**`MilestoneFactory`** — Creates milestone streams
```
Choice: CreateMilestoneStream(sender, receiver, milestones, deposited)
Validation: deposit must cover sum of all milestone amounts
```

---

### 3.7 FeaturedAppActivity — CIP-0047 Reward Tracking

**File:** `daml-contracts/daml/FeaturedAppActivity.daml`

Stub for the CIP-0047 Featured App model. Every significant dApp action creates a `FeaturedAppActivityRecord` which Canton validators consume to credit CC rewards.

**`FeaturedAppActivityRecord`**
```
Fields: provider (Party), activityType (Text), referenceId (Text), timestamp (Time)
Signatory: provider

Activity Types (recorded across all contracts):
  stream_created, stream_withdraw, stream_stop_final, pause_settle,
  rate_update_settle, pool_withdraw, pool_pause_settle,
  vesting_withdraw, vesting_stop, milestone_confirm,
  milestone_refund, milestone_force_refund
```

**`AppRewardCoupon`** — Authorization for activity recording
```
Fields: provider, users
Choice: MintActivityRecord(caller, activityType, referenceId) → creates FeaturedAppActivityRecord
```

> **Production Note:** Replace this stub with `Splice.Amulet.FeaturedApp.FeaturedAppActivityMarker` from `splice-amulet.dar` when available via DPM.

---

### 3.8 HelloStream — Learning Exercise

**File:** `daml-contracts/daml/HelloStream.daml`

Minimal contract for learning purposes.
```
template SimpleStream: sender, receiver, amount
Choice: Withdraw → receiver → returns amount
```

---

## 4. Backend Services

### 4.1 Canton Client (`app/clients/canton_client.py`)

Async HTTP client wrapping all Canton JSON API v2 endpoints. Uses `httpx.AsyncClient`.

| Method | Canton Endpoint | Purpose |
|--------|----------------|---------|
| `get_version()` | `GET /v2/version` | Ledger version info |
| `get_ledger_end()` | `GET /v2/state/ledger-end` | Current ledger offset |
| `list_parties()` | `GET /v2/parties` | All known parties |
| `list_packages()` | `GET /v2/packages` | Uploaded DAR packages |
| `upload_dar(bytes)` | `POST /v2/packages` | Upload DAR file |
| `submit_and_wait(payload)` | `POST /v2/commands/submit-and-wait` | Exercise choices / create contracts |
| `allocate_party(name, hint)` | `POST /v2/parties` | Allocate new party |
| `query_active_contracts_raw(party, template)` | `POST /v2/state/active-contracts` | Query ACS (Active Contract Set) |

### 4.2 Canton Query Service (`app/services/canton_query_service.py`)

Shared ACS query helpers used by all domain services.

- `all_contracts(party_id)` → parse NDJSON response → `list[ContractView]`
- `contracts_by_template(party_id, template_name)` → filter by template
- `get_contract(party_id, contract_id)` → find specific contract or raise `ContractNotFoundError`

### 4.3 Command Builder (`app/services/command_builder.py`)

Constructs all Canton `submit-and-wait` payloads. Central place for command construction — routes never build payloads directly.

**Rules:**
- Template IDs always include `packageId` prefix
- `commandId` is deterministic per (contract, choice, request) via SHA256
- `userId` comes from config, never from requests
- `actAs` is the acting party; `readAs` includes all known parties
- Decimal amounts are passed as strings (Canton JSON API requirement)

**Available Builders:**

| Method | DAML Choice |
|--------|------------|
| `stream_withdraw` | `StreamAgreement.Withdraw` |
| `stream_pause` | `StreamAgreement.Pause` |
| `stream_resume` | `StreamAgreement.Resume` |
| `stream_stop` | `StreamAgreement.Stop` |
| `stream_top_up` | `StreamAgreement.TopUp` |
| `stream_create` | `StreamFactory.CreateStream` |
| `pool_withdraw_member` | `StreamPool.WithdrawMember` |
| `pool_top_up` | `StreamPool.TopUpPool` |
| `pool_pause` | `StreamPool.PausePool` |
| `pool_resume` | `StreamPool.ResumePool` |
| `pool_add_member` | `StreamPool.AddMember` |
| `vesting_withdraw` | `VestingStream.VestingWithdraw` |
| `vesting_stop` | `VestingStream.VestingStop` |
| `milestone_confirm` | `MilestoneStream.ConfirmMilestone` |
| `milestone_refund` | `MilestoneStream.RefundRemaining` |
| `milestone_force_refund` | `MilestoneStream.ForceRefund` |

### 4.4 Domain Services

| Service | File | Description |
|---------|------|-------------|
| **StreamService** | `stream_service.py` | List/get/create/withdraw/pause/resume/stop/top-up streams |
| **TokenService** | `token_service.py` | List GrowToken contracts, get balance per party, all balances |
| **LPPoolService** | `lp_pool_service.py` | List pools, withdraw share, top-up, pause/resume, add member |
| **BillingService** | `billing_service.py` | List billing sessions (streams as billing), pause/resume |
| **VestingService** | `vesting_service.py` | List vesting schedules, withdraw, stop |
| **MilestoneService** | `milestone_service.py` | List milestones, confirm, release refund, force cancel |
| **RewardsService** | `rewards_service.py` | Query FeaturedAppActivityRecord, compute CC revenue projections |
| **DemoService** | `demo_service.py` | Aggregate full ledger state for demo dashboard |
| **CampaignService** | `campaign_service.py` | CRUD campaigns, enrollment, leaderboard, payout preview (PostgreSQL) |
| **XPService** | `xp_service.py` | Award XP, referral bonuses, global leaderboard, stats (PostgreSQL) |
| **ParticipantService** | `participant_service.py` | Create/get participants, stats with rank (PostgreSQL) |

### 4.5 Rewards Projection (CIP-0047)

The `RewardsService` computes CC revenue estimates based on on-chain activity records:

```
Constants:
  MONTHLY_REWARDS_POOL_CC = 516,000,000 CC
  ESTIMATED_NETWORK_TXN   = 40,000,000 txn/month
  CC_PRICE_USD            = $0.1546

Formula:
  network_share = app_monthly_txns / ESTIMATED_NETWORK_TXN
  monthly_cc    = MONTHLY_REWARDS_POOL × network_share
  monthly_usd   = monthly_cc × CC_PRICE_USD
```

---

## 5. API Endpoints

Base URL: `http://localhost:8000`
Docs: `http://localhost:8000/docs` (Swagger) | `http://localhost:8000/redoc`

### 5.1 Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service health + Canton reachability |

### 5.2 Canton Administration

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/canton/version` | Canton ledger version |
| `GET` | `/canton/ledger-end` | Current ledger offset |
| `GET` | `/canton/packages` | List uploaded DAR packages |
| `POST` | `/canton/packages/upload` | Upload `.dar` file |

### 5.3 Parties

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/parties` | List all known parties |
| `POST` | `/parties/allocate` | Allocate a new party (admin only) |

### 5.4 Tokens (GrowToken)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/tokens?party={partyId}` | List token contracts for party |
| `GET` | `/tokens/balances` | All parties' CC balances |

### 5.5 Streams (StreamAgreement)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/streams` | Create new stream |
| `GET` | `/streams?party={partyId}` | List streams for party |
| `GET` | `/streams/{contractId}?party={partyId}` | Get single stream |
| `POST` | `/streams/{contractId}/withdraw?party={partyId}` | Withdraw accrued tokens |
| `POST` | `/streams/{contractId}/pause?party={partyId}` | Pause stream |
| `POST` | `/streams/{contractId}/resume?party={partyId}` | Resume stream |
| `POST` | `/streams/{contractId}/cancel?party={partyId}` | Stop stream |
| `POST` | `/streams/{contractId}/top-up?party={partyId}` | Top up deposit |

### 5.6 LP Pools (StreamPool)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/lp-pools?party={partyId}` | List pools |
| `POST` | `/lp-pools/{contractId}/withdraw-share` | Member withdrawal |
| `POST` | `/lp-pools/{contractId}/pause` | Pause pool |
| `POST` | `/lp-pools/{contractId}/resume` | Resume pool |
| `POST` | `/lp-pools/{contractId}/add-member` | Add new member |

### 5.7 Billing Sessions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/billing/sessions?party={partyId}` | List billing sessions |
| `POST` | `/billing/sessions/{contractId}/pause?party={partyId}` | Pause session |
| `POST` | `/billing/sessions/{contractId}/resume?party={partyId}` | Resume session |

### 5.8 Vesting

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/vesting?party={partyId}` | List vesting schedules |
| `POST` | `/vesting/{contractId}/withdraw?party={partyId}` | Withdraw vested tokens |
| `POST` | `/vesting/{contractId}/stop?party={partyId}` | Stop vesting (refund unvested) |

### 5.9 Milestones

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/milestones?party={partyId}` | List milestone streams |
| `POST` | `/milestones/{contractId}/confirm` | Confirm a milestone (admin) |
| `POST` | `/milestones/{contractId}/release` | Refund remaining (after all done) |
| `POST` | `/milestones/{contractId}/cancel` | Force cancel / refund |

### 5.10 Subscriptions (Stream-as-Subscription view)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/subscriptions?party={partyId}` | List subscriptions |
| `POST` | `/subscriptions/{contractId}/pause?party={partyId}` | Pause |
| `POST` | `/subscriptions/{contractId}/resume?party={partyId}` | Resume |
| `POST` | `/subscriptions/{contractId}/withdraw?party={partyId}` | Withdraw |

### 5.11 Rewards (CIP-0047)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/rewards/activity?party={partyId}` | List activity records |
| `GET` | `/rewards/summary?party={partyId}` | CC revenue projection |

### 5.12 Campaigns (PostgreSQL)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/campaigns` | Create campaign |
| `GET` | `/campaigns?status=&track_type=&page=&limit=` | List campaigns |
| `GET` | `/campaigns/active` | Active campaigns only |
| `GET` | `/campaigns/{id}` | Get campaign details |
| `POST` | `/campaigns/{id}/fund?wallet=` | Fund campaign |
| `POST` | `/campaigns/{id}/enroll` | Enroll in campaign |
| `GET` | `/campaigns/{id}/participants` | Campaign participants |
| `GET` | `/campaigns/{id}/leaderboard` | Campaign leaderboard |
| `GET` | `/campaigns/{id}/payout-preview` | Payout preview |

### 5.13 Participants (PostgreSQL)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/participants` | Create/get participant |
| `GET` | `/participants/{wallet}` | Get participant |
| `GET` | `/participants/{wallet}/stats` | Participant stats + rank |

### 5.14 Leaderboard (PostgreSQL)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/leaderboard?page=&limit=&track=` | Global leaderboard |
| `GET` | `/leaderboard/stats` | Aggregate stats |

### 5.15 Demo

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/demo/state` | Full ACS state aggregation |
| `GET` | `/demo/use-cases` | List of 6 use cases with contracts/parties/choices |
| `POST` | `/demo/run-cycle` | Fetch real ACS state summary |

---

## 6. Database Schema

**Migration:** `app/migrations/001_initial.sql`

PostgreSQL is **optional**. Without `DATABASE_URL`, endpoints return demo data.

### Tables

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | auto-generated |
| wallet | TEXT (unique) | Canton party ID or wallet address |
| github_handle | TEXT | |
| x_handle | TEXT | |
| display_name | TEXT | |
| referral_code | TEXT (unique) | |
| referred_by | UUID (FK→users) | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `participants`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL (PK) | |
| wallet | TEXT (unique) | |
| github_handle | TEXT (unique) | |
| x_handle | TEXT (unique) | |
| display_name | TEXT | |
| track | TEXT | `OSS`, `CONTENT`, or `BOTH` |
| total_xp | INTEGER | running total |
| user_id | UUID (FK→users) | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### `contributions`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL (PK) | |
| wallet | TEXT (FK→participants) | |
| track | TEXT | `OSS` or `CONTENT` |
| external_id | TEXT | |
| pr_number | INTEGER | GitHub PR |
| tweet_id | TEXT | Twitter/X |
| score | INTEGER | |
| xp_awarded | INTEGER | |
| status | TEXT | default `ACTIVE` |
| agent_feedback | TEXT | AI agent review |
| agent_response | JSONB | |
| campaign_id | UUID (FK→campaigns) | |
| campaign_count | INTEGER | |

#### `xp_events`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL (PK) | |
| wallet | TEXT (FK→participants) | |
| xp_delta | INTEGER | can be negative |
| reason | TEXT | e.g. `INITIAL_AWARD`, `REFERRAL_BONUS` |
| contribution_id | INTEGER (FK→contributions) | |
| campaign_id | UUID (FK→campaigns) | |
| created_at | TIMESTAMPTZ | |

#### `campaigns`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| creator_wallet | VARCHAR | |
| title | VARCHAR(200) | |
| description | TEXT | |
| pool_amount | NUMERIC(20,6) | CC token pool |
| pool_remaining | NUMERIC(20,6) | |
| token | VARCHAR(20) | default `CC` |
| status | VARCHAR(20) | `DRAFT→FUNDED→ACTIVE→ENDED→SETTLING→CLOSED` |
| track_type | VARCHAR(20) | `OSS`, `CONTENT`, `BOTH` |
| start_date | TIMESTAMPTZ | |
| end_date | TIMESTAMPTZ | |
| required_hashtags | TEXT[] | |
| required_mentions | TEXT[] | |
| github_repo_url | VARCHAR | |
| github_issue_labels | TEXT[] | |
| max_oss_contributions | INTEGER | default 3 |
| max_content_contributions | INTEGER | default 10 |
| score_threshold | INTEGER | default 70 |

#### `campaign_participants`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| campaign_id | UUID (FK→campaigns) | |
| wallet | VARCHAR | |
| campaign_xp | INTEGER | XP within this campaign |
| enrolled_at | TIMESTAMPTZ | |

#### `campaign_payouts`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| campaign_id | UUID (FK→campaigns) | |
| wallet | VARCHAR | |
| xp_earned | INTEGER | |
| xp_share | NUMERIC(10,6) | fraction of total XP |
| cc_amount | NUMERIC(20,6) | CC payout |
| status | VARCHAR(20) | `PENDING→EXECUTED / FAILED / BELOW_MINIMUM` |
| tx_hash | VARCHAR | on-chain tx |
| executed_at | TIMESTAMPTZ | |

#### `daily_snapshots`
Leaderboard history snapshots.

#### `referrals`
Tracks referral relationships between users.

---

## 7. Configuration

### Environment Variables (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `CANTON_LEDGER_API_URL` | `http://localhost:7575` | Canton JSON API v2 base URL |
| `CANTON_USER_ID` | `participant_admin` | Canton ledger user |
| `CANTON_PACKAGE_ID` | `054d83ae...` | DAML package hash (from `daml build`) |
| `CANTON_TIMEOUT_SECONDS` | `30.0` | HTTP timeout for Canton calls |
| `CANTON_NAMESPACE` | `""` | Auto-construct party IDs as `Name::namespace` |
| `CANTON_ADMIN_PARTY` | `""` | Full party ID for Admin |
| `CANTON_ALICE_PARTY` | `""` | Full party ID for Alice |
| `CANTON_BOB_PARTY` | `""` | Full party ID for Bob |
| `CANTON_CAROL_PARTY` | `""` | Full party ID for Carol |
| `APP_ENV` | `local` | Environment name |
| `APP_NAME` | `growstreams-api` | Service name |
| `ENABLE_ADMIN_ENDPOINTS` | `true` | Enable party allocation |
| `ENABLE_DEMO_ENDPOINTS` | `true` | Enable demo routes |
| `CORS_ORIGINS` | `http://localhost:3000,...` | Comma-separated origins |
| `DATABASE_URL` | `""` | PostgreSQL connection string (optional) |
| `DATABASE_POOL_SIZE` | `10` | Connection pool size |
| `DATABASE_MAX_OVERFLOW` | `20` | Max pool overflow |

### Party Resolution

Parties are resolved in order:
1. Explicit env vars (`CANTON_ALICE_PARTY`, etc.)
2. Namespace construction (`Alice::{CANTON_NAMESPACE}`)
3. Not configured (endpoint returns error for missing party)

---

## 8. Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app, lifespan, CORS, error handlers, router registration
│   ├── config.py                  # Pydantic Settings (env vars)
│   ├── db.py                      # asyncpg pool management
│   ├── dependencies.py            # FastAPI DI providers for services
│   │
│   ├── clients/
│   │   └── canton_client.py       # Canton JSON API v2 HTTP client
│   │
│   ├── models/                    # Pydantic request/response models
│   │   ├── billing.py
│   │   ├── campaigns.py
│   │   ├── canton.py
│   │   ├── common.py              # APIError, TxResult, ContractRef, PartyName
│   │   ├── lp_pools.py
│   │   ├── milestones.py
│   │   ├── participants.py
│   │   ├── rewards.py
│   │   ├── streams.py
│   │   ├── subscriptions.py
│   │   ├── tokens.py
│   │   ├── vesting.py
│   │   └── xp.py
│   │
│   ├── routes/                    # FastAPI routers (thin — delegate to services)
│   │   ├── billing.py             # /billing/sessions
│   │   ├── campaigns.py           # /campaigns (+ demo fallback)
│   │   ├── canton.py              # /canton (version, packages, ledger-end)
│   │   ├── demo.py                # /demo (state, use-cases, run-cycle)
│   │   ├── health.py              # /health
│   │   ├── leaderboard.py         # /leaderboard (+ demo fallback)
│   │   ├── lp_pools.py            # /lp-pools
│   │   ├── milestones.py          # /milestones
│   │   ├── participants.py        # /participants (+ demo fallback)
│   │   ├── parties.py             # /parties
│   │   ├── rewards.py             # /rewards
│   │   ├── streams.py             # /streams
│   │   ├── subscriptions.py       # /subscriptions
│   │   ├── tokens.py              # /tokens
│   │   └── vesting.py             # /vesting
│   │
│   ├── services/                  # Business logic
│   │   ├── billing_service.py
│   │   ├── campaign_service.py    # PostgreSQL CRUD
│   │   ├── canton_query_service.py# ACS query + parsing
│   │   ├── command_builder.py     # Canton command payload construction
│   │   ├── demo_service.py        # Full ledger state aggregation
│   │   ├── lp_pool_service.py
│   │   ├── milestone_service.py
│   │   ├── participant_service.py # PostgreSQL CRUD
│   │   ├── rewards_service.py     # CIP-0047 projections
│   │   ├── stream_service.py
│   │   ├── token_service.py
│   │   ├── vesting_service.py
│   │   └── xp_service.py          # XP awarding + referral bonuses
│   │
│   ├── utils/
│   │   ├── command_ids.py         # Deterministic + timestamped command IDs
│   │   ├── decimals.py            # Safe Decimal parsing
│   │   ├── errors.py              # CantonError, CantonUnavailableError, ContractNotFoundError
│   │   ├── parsing.py             # NDJSON/JSON ACS response parser → ContractView
│   │   ├── request_id.py          # X-Request-ID middleware
│   │   ├── template_ids.py        # Template ID construction + choice whitelist
│   │   └── time.py                # UTC time + Canton time parsing
│   │
│   └── migrations/
│       └── 001_initial.sql        # Full DB schema (10 tables, 23 indexes)
│
├── tests/
│   ├── conftest.py
│   ├── test_canton_error_mapping.py
│   ├── test_command_builder.py
│   ├── test_command_ids.py
│   ├── test_decimals.py
│   ├── test_health.py
│   ├── test_parsing.py
│   └── test_template_ids.py
│
├── pyproject.toml                 # Project config (hatchling, ruff, pytest, mypy)
├── requirements.txt
├── requirements-dev.txt
└── run_migrations.py
```

---

## 9. Error Handling

### Error Hierarchy

```
Exception
├── CantonError(status, code, message, details)
│   └── CantonUnavailableError              → HTTP 503
├── ContractNotFoundError(contract_id)       → HTTP 404
└── ValueError                               → HTTP 422
```

### Canton Error Code Mapping

| Canton Code | HTTP Status | User Message |
|------------|-------------|--------------|
| `CONTRACT_NOT_FOUND` | 404 | "Contract not found — may be archived" |
| `DUPLICATE_COMMAND` | 409 | "Duplicate command — already submitted" |
| `DAML_INTERPRETATION_ERROR` | 422 | "DAML contract rejected the action" |
| `PERMISSION_DENIED` | 403 | Original message |
| 5xx | 502 | Original message |

### Response Format

All errors return:
```json
{
  "error": {
    "code": "CANTON_ERROR",
    "message": "Human-readable message",
    "request_id": "uuid",
    "details": { ... }
  }
}
```

Every response includes `X-Request-ID` header for tracing.

---

## 10. Testing

### Test Files

| File | Coverage |
|------|----------|
| `test_parsing.py` | NDJSON/JSON/envelope ACS parsing |
| `test_command_builder.py` | All command payload construction |
| `test_command_ids.py` | Deterministic + timestamped ID generation |
| `test_template_ids.py` | Template ID construction + choice whitelisting |
| `test_decimals.py` | Safe decimal parsing edge cases |
| `test_canton_error_mapping.py` | Canton → HTTP status code mapping |
| `test_health.py` | Health endpoint response |

### Running Tests

```bash
cd backend
pip install -e ".[dev]"
pytest -v
```

### Running the Server

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Use Cases Supported

| # | Use Case | Contracts Used | Description |
|---|----------|---------------|-------------|
| UC1 | **Payroll Streaming** | `StreamAgreement` | Continuous per-second salary payments |
| UC2 | **LP Incentive Rewards** | `StreamPool` | 1-to-N proportional reward distribution |
| UC3 | **Institutional Billing** | `StreamAgreement` | Per-second metered billing with pause/resume |
| UC4 | **Token Vesting** | `VestingStream` | Cliff + linear unlock for employee tokens |
| UC5 | **B2B SaaS Subscription** | `StreamAgreement` | Per-second subscription billing |
| UC6 | **Milestone Escrow** | `MilestoneStream` | DVP payment release by admin oracle |
| UC7 | **Campaign Rewards** | PostgreSQL + `GrowToken` | XP-based CC distribution campaigns |
| UC8 | **Featured App Rewards** | `FeaturedAppActivityRecord` | CIP-0047 CC revenue for dApp operators |

---

*Generated from source analysis of `Canton_Streams_RewardApp/backend/` and `Canton_Streams_RewardApp/daml-contracts/`*
