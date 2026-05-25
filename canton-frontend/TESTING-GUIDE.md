# GrowStreams Frontend Testing Guide

## Prerequisites

1. **Canton Party ID** — Use your Canton party ID (configured in `.env`)
2. **Canton DevNet** — Ensure Canton LocalNet is running (`http://localhost:7575`)
3. **Start the dev server**:
   ```bash
   cd frontend
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## Flow 1: CC Token Full Lifecycle (Primary Flow)

This is the main feature — streaming CC (Canton Coin) tokens per-second to another party.

### Step 1 — Connect Wallet

1. Open the app. You should see a wallet connect screen.
2. Enter your Canton party ID or select from configured parties.
3. Verify connection to Canton DevNet.
4. You should land on the app dashboard after connecting.

### Step 2 — Navigate to CC Token Page

1. In the sidebar, click **CC Token**.
2. You should see:
   - Balance overview (Wallet, Vault)
   - A **Getting Started** step tracker (Get CC → Deposit → Stream)
   - Tabbed action panel (Faucet, Vault, Transfer)

### Step 3 — Mint CC Tokens (Faucet Tab)

1. The **Faucet** tab should be active by default.
2. Click **"Mint 1,000 CC"**.
3. The FastAPI backend will call Canton to mint tokens.
4. Wait ~2 seconds for confirmation. A success toast should appear.
5. Click the refresh button — your **Wallet Balance** should show **1,000 CC** (or 1K).
6. The step tracker should now show Step 1 as completed (green checkmark).

**Expected result:** Wallet balance = 1,000 CC

### Step 4 — Deposit to Vault (Vault Tab)

1. Click the **Vault** tab.
2. Enter **500** in the amount field (or click the "500" preset button).
3. Click **"Deposit to Vault"**.
4. The backend will call Canton to deposit tokens.
5. Wait for confirmation toast.
6. Refresh — **Vault Balance** should now show **500 CC**.

**Expected result:** Vault balance = 500 CC

### Step 5 — Create a Stream (Streams Page)

1. Navigate to **Streams** page from the sidebar.
2. Click **"Create Stream"** (green button, top right).
3. Token should default to **CC Token**.
4. Enter:
   - **Receiver Party**: Another Canton party ID (e.g., `alice::party`)
   - **Flow Rate**: `0.001` (preset button available) — this streams 0.001 CC per second
   - **Initial Deposit**: `10` (preset button available) — this funds 10 CC for the stream
5. The summary should show:
   - Stream duration: ~2h 46m
   - Daily outflow: 86.4 CC/day
   - Min buffer (1h): 3.6 CC
6. Click **"Create Stream"**.
7. The backend will call Canton to create the stream.
8. Wait for confirmation toast.
9. The stream should appear in the list with status **Active** and a real-time progress bar.

**Expected result:** Active stream visible with real-time counter

### Step 6 — Stream Actions

With an active stream visible:

- **Sender actions** (if you are the sender):
  - **Pause** — Click pause icon. Stream stops counting.
  - **Resume** — Click play icon on a paused stream. Counting resumes.
  - **Top Up** — Enter amount and click "Top Up" to add more deposit.
  - **Stop** — Click stop icon. Stream ends, unstreamed funds returned.

- **Receiver actions** (if you are the receiver):
  - **Withdraw** — Click "Withdraw" to claim streamed tokens.

### Step 7 — Withdraw from Vault (CC Page)

1. Go back to **CC Token** page.
2. Click the **Vault** tab.
3. In the **Withdraw** section, enter an amount (or click "Max").
4. Click **"Withdraw from Vault"**.
5. Your **Wallet Balance** should increase.

### Step 8 — Transfer CC (Optional)

1. On the CC Token page, click the **Transfer** tab.
2. Enter a recipient party ID and amount (in CC).
3. Click **"Send"**.
4. This is a direct wallet-to-wallet transfer, not a stream.

## Flow 2: Native CC Streaming

1. On the **Streams** page, click "Create Stream".
2. Token defaults to **CC Token** (native Canton Coin).
3. Enter receiver party ID, flow rate, and deposit.
4. This streams native CC tokens.

---

## Flow 3: Vault Page (Direct Vault Management)

1. Navigate to the **Vault** page from the sidebar.
2. This shows your vault balance for CC tokens.
3. You can deposit/withdraw CC here.

---

| Step | What to Check |
|------|--------------|
| Connect Party | Party ID shows in header, sidebar loads |
| Mint CC | Wallet balance updates after ~2s |
| Deposit | Wallet decreases, vault balance increases |
| Create Stream | Stream appears in list with Active status |
| Stream Running | Progress bar moves, "Total Streamed" increases every second |
| Pause/Resume | Status changes, timer stops/starts |
| Withdraw (receiver) | Toast confirms withdrawal amount |
| Withdraw from Vault | Wallet balance increases |
| Transfer | Recipient balance increases (verify via CC Token page) |

---

## What to Verify at Each Step

| Issue | Fix |
|-------|-----|
| "Connection failed" | Ensure Canton LocalNet is running at `http://localhost:7575` |
| Balance shows 0 after transaction | Click the refresh icon — balances update after ~2 seconds |
| Transaction fails | Check backend logs for Canton API errors |
| Faucet mint fails | Only the admin party can mint — check party configuration |
| Stream create fails | Ensure deposit covers the minimum buffer (flow_rate × 3600 seconds) |
| Page shows "Connecting to Canton..." indefinitely | Refresh the page, check backend health endpoint |

---

## Troubleshooting

## Key Canton Templates

| Template | Purpose |
|----------|---------|
| StreamAgreement | Per-second payment streams |
| GrowToken | CC token with UTXO model |
| StreamPool | 1-to-N distribution pools |
| VestingStream | Cliff + linear vesting |
| MilestoneStream | Milestone-based escrow |

---

## API Base URL

`http://localhost:8000` (FastAPI backend)

## Quick Smoke Test (5 minutes)

If you're short on time, do this minimal flow:

1. Connect party ID
2. Go to CC Token → Faucet → Mint 1,000 CC
3. Vault tab → Deposit 100 CC
4. Go to Streams → Create Stream (0.001 CC/s, 10 CC deposit, any receiver)
5. Watch the stream progress bar move in real-time

If all 5 steps work without errors, the core flow is functional.

---

