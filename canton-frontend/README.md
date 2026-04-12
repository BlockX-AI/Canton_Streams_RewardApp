# GrowStreams Canton Frontend

Real-time token streaming on Canton Network. Demo frontend for Canton Dev Fund submission.

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Canton sandbox running on `localhost:6865`
- Canton JSON API running on `localhost:7575`

### Installation

```bash
cd canton-frontend
npm install
```

### Configuration

1. Copy `env.example` to `.env.local`:
```bash
cp env.example .env.local
```

2. Update party IDs in `.env.local` with your actual Canton party IDs from `evidence/contract-ids.txt`

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Features

### Current (Demo Mode)
- Real-time stream visualization
- Live accrual calculation (updates every second)
- Party switcher (Alice/Bob/Admin views)
- Stream lifecycle controls (Withdraw, Pause, Resume, Stop)
- Progress bars and time remaining
- Mock data for demonstration

### Planned (Canton JSON API Integration)
- Connect to actual Canton JSON API
- Query real StreamAgreement contracts
- Execute choices on Canton ledger
- Real-time contract updates via WebSocket

---

## Project Structure

```
canton-frontend/
├── app/
│   ├── page.tsx          # Main streams dashboard
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── lib/
│   └── canton-api.ts     # Canton JSON API client
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

---

## Canton Integration

### Canton JSON API Setup

1. Start Canton sandbox:
```bash
cd daml-contracts
dpm sandbox --dar .daml/dist/growstreams-1.0.0.dar
```

2. Start Canton JSON API:
```bash
daml json-api \
  --ledger-host localhost \
  --ledger-port 6865 \
  --http-port 7575 \
  --allow-insecure-tokens
```

3. Verify JSON API is running:
```bash
curl http://localhost:7575/v2/state/active-contracts
```

### API Methods

The `canton-api.ts` file provides:
- `queryContracts()` - Query active contracts
- `exerciseChoice()` - Execute choices (Withdraw, Pause, etc.)
- `createContract()` - Create new contracts
- `calculateAccrued()` - Client-side accrual calculation

---

## Development

### Build for Production
```bash
npm run build
npm start
```

### Lint
```bash
npm run lint
```

---

## Canton Dev Fund Proof Points

This frontend demonstrates:
- Real-time accrual that updates every second without extra blockchain queries
- ObligationView non-consuming balance checks
- Full lifecycle management (Withdraw, Pause, Resume, Stop)
- Multi-party views (Alice, Bob, Admin)
- Canton JSON API integration via proxy routes

---

## Next Steps

1. Connect to real Canton JSON API and replace mock data with actual queries
2. Add WebSocket support for real-time contract updates
3. Add stream creation UI to create new streams from the frontend
4. Add token management for minting and transferring GROW tokens

---

Status: Demo-ready with mock data. Canton JSON API integration pending.
