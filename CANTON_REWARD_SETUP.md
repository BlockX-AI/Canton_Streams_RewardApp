# Canton Stream Reward - Superfluid-Style Campaign System

## Summary

A Superfluid-inspired reward/campaign system has been added to the Canton Stream Reward app. This system is **Canton-first** and excludes all Vara-specific dependencies from the original GrowStreams_Backend.

## What Was Implemented

### Backend (Python/FastAPI)

**New Dependencies:**
- `asyncpg` - Async PostgreSQL driver
- `alembic` - Database migrations (optional, using custom runner)

**Database Layer (`app/db.py`):**
- Connection pool management
- Async query helpers (execute, fetch, fetch_all, fetch_val)
- Graceful shutdown handling

**Models:**
- `app/models/campaigns.py` - Campaign, CampaignParticipant, LeaderboardEntry, PayoutPreview
- `app/models/participants.py` - Participant, ParticipantStats
- `app/models/xp.py` - XPEvent, XPAward, LeaderboardStats

**Services:**
- `app/services/campaign_service.py` - Campaign CRUD, enrollment, leaderboard, payout preview
- `app/services/participant_service.py` - Participant management, stats
- `app/services/xp_service.py` - XP awarding, referral bonuses, global leaderboard

**API Routes:**
- `app/routes/campaigns.py` - `/api/campaigns` endpoints
- `app/routes/leaderboard.py` - `/api/leaderboard` endpoints
- `app/routes/participants.py` - `/api/participants` endpoints

**Database Schema (`app/migrations/001_initial.sql`):**
- Users & referrals (for referral system)
- Participants (campaign participants)
- Contributions (OSS/Content tasks)
- XP events (award history)
- Daily snapshots (leaderboard history)
- Campaigns (campaign definitions)
- Campaign participants (enrollment)
- Campaign payouts (settlement records)

**Migration Runner:**
- `run_migrations.py` - Simple Python script to run SQL migrations

### Frontend (Next.js/React)

**New Pages:**
- `app/campaigns/page.tsx` - Campaigns list with status badges
- `app/campaigns/[id]/page.tsx` - Campaign detail with leaderboard and enrollment
- `app/leaderboard/page.tsx` - Global leaderboard with track filtering
- `app/claim/page.tsx` - Reward claim interface (demo UI)

**Navigation Updates:**
- Added Campaigns, Leaderboard, Claim links to nav (cyan accent)
- Mobile menu updated with new links

**Design:**
- Consistent with existing Canton branding (dark theme, cyan accents)
- Motion animations using motion/react
- Responsive layouts

## What Was NOT Copied (Vara-Specific)

Excluded from GrowStreams_Backend:
- VFT token service (token-service.mjs)
- Bridge transaction tracking
- VARA prize pools
- Gear API integration
- Substrate-specific wallet handling
- Vara network configuration

## Next Steps / Blockers

### Required Before Testing

1. **Set up PostgreSQL database**
   - Install PostgreSQL locally or use cloud provider (Supabase, Neon, Railway)
   - Create database: `createdb canton_streams`
   - Add `DATABASE_URL` to backend `.env`

2. **Run migrations**
   ```bash
   cd backend
   python run_migrations.py
   ```

3. **Install new Python dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. **Start backend**
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

5. **Start frontend**
   ```bash
   cd canton-frontend
   npm run dev
   ```

### Optional Enhancements

1. **Create first campaign** - Use API or add admin UI
2. **Integrate with Canton contracts** - Connect XP awards to actual stream events
3. **Add authentication** - Wallet connection for enrollment
4. **Implement actual claim logic** - Connect to Canton CC contract
5. **Add cron jobs** - Daily XP snapshots, campaign lifecycle
6. **Add staking feature** - Like Superfluid's "stake as you claim"

### Known Limitations

- Claim page is demo-only (no actual Canton contract integration)
- No wallet authentication (uses manual wallet input)
- No admin UI for creating campaigns (API-only)
- Referral system tables created but service not fully implemented
- No quest system (can be added later if needed)

## API Endpoints

### Campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns` - List campaigns (filter by status, track_type)
- `GET /api/campaigns/active` - Get active campaigns
- `GET /api/campaigns/{id}` - Get campaign details
- `POST /api/campaigns/{id}/fund` - Fund campaign
- `POST /api/campaigns/{id}/enroll` - Enroll in campaign
- `GET /api/campaigns/{id}/participants` - List participants
- `GET /api/campaigns/{id}/leaderboard` - Campaign leaderboard
- `GET /api/campaigns/{id}/payout-preview` - Preview payouts

### Leaderboard
- `GET /api/leaderboard` - Global leaderboard (filter by track)
- `GET /api/leaderboard/stats` - Global stats

### Participants
- `POST /api/participants` - Create participant
- `GET /api/participants/{wallet}` - Get participant
- `GET /api/participants/{wallet}/stats` - Get participant stats

## Architecture Notes

The system follows the Superfluid pattern:
- **Campaigns** = Superfluid campaigns
- **XP** = Superfluid SUP tokens
- **Leaderboard** = Superfluid leaderboard
- **Claim** = Superfluid claim app
- **CC** = Super token (Canton Coin)

Key difference: Canton provides privacy for institutional use cases, which Superfluid on Ethereum lacks.
