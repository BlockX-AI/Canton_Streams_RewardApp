-- Core tables for Canton Stream Reward campaign system
-- Ported from GrowStreams_Backend, adapted for Canton (no Vara-specific fields)

-- Users table (for referral system)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet         TEXT UNIQUE NOT NULL,
  github_handle  TEXT,
  x_handle       TEXT,
  display_name   TEXT,
  referral_code  TEXT UNIQUE NOT NULL,
  referred_by    UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES users(id),
  referred_user_id UUID NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referrer_user_id, referred_user_id)
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id            SERIAL PRIMARY KEY,
  wallet        TEXT UNIQUE NOT NULL,
  github_handle TEXT UNIQUE,
  x_handle      TEXT UNIQUE,
  display_name  TEXT,
  track         TEXT NOT NULL CHECK (track IN ('OSS', 'CONTENT', 'BOTH')),
  total_xp      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add user_id FK to participants (after both tables exist)
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Contributions table
CREATE TABLE IF NOT EXISTS contributions (
  id              SERIAL PRIMARY KEY,
  wallet          TEXT NOT NULL REFERENCES participants(wallet),
  track           TEXT NOT NULL CHECK (track IN ('OSS', 'CONTENT')),
  external_id     TEXT,
  pr_number       INTEGER,
  tweet_id        TEXT,
  score           INTEGER NOT NULL DEFAULT 0,
  xp_awarded      INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'ACTIVE',
  agent_feedback  TEXT,
  agent_response  JSONB,
  first_scored_at TIMESTAMPTZ,
  max_daily_until TIMESTAMPTZ,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- XP events table
CREATE TABLE IF NOT EXISTS xp_events (
  id              SERIAL PRIMARY KEY,
  wallet          TEXT NOT NULL REFERENCES participants(wallet),
  xp_delta        INTEGER NOT NULL,
  reason          TEXT NOT NULL,
  contribution_id INTEGER REFERENCES contributions(id),
  campaign_id     UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily snapshots for leaderboard history
CREATE TABLE IF NOT EXISTS daily_snapshots (
  id                SERIAL PRIMARY KEY,
  snapshot_date     DATE NOT NULL,
  wallet            TEXT NOT NULL REFERENCES participants(wallet),
  xp_at_snapshot    INTEGER NOT NULL DEFAULT 0,
  rank_at_snapshot  INTEGER NOT NULL DEFAULT 0,
  UNIQUE(snapshot_date, wallet)
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_wallet        VARCHAR NOT NULL,
  title                 VARCHAR(200) NOT NULL,
  description           TEXT,
  pool_amount           NUMERIC(20,6) NOT NULL,
  pool_remaining        NUMERIC(20,6) NOT NULL,
  token                 VARCHAR(20) NOT NULL DEFAULT 'CC',
  status                VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                      CHECK (status IN ('DRAFT','FUNDED','ACTIVE','ENDED','SETTLING','CLOSED')),
  track_type            VARCHAR(20) NOT NULL DEFAULT 'BOTH'
                      CHECK (track_type IN ('OSS','CONTENT','BOTH')),
  start_date            TIMESTAMPTZ NOT NULL,
  end_date              TIMESTAMPTZ NOT NULL,
  ended_at              TIMESTAMPTZ,
  funding_tx_hash       VARCHAR,
  required_hashtags     TEXT[],
  required_mentions     TEXT[],
  github_repo_url       VARCHAR,
  github_issue_labels   TEXT[],
  max_oss_contributions     INTEGER DEFAULT 3,
  max_content_contributions INTEGER DEFAULT 10,
  score_threshold       INTEGER DEFAULT 70,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Campaign participants table
CREATE TABLE IF NOT EXISTS campaign_participants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  UUID NOT NULL REFERENCES campaigns(id),
  wallet       VARCHAR NOT NULL,
  campaign_xp  INTEGER NOT NULL DEFAULT 0,
  enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, wallet)
);

-- Campaign payouts table
CREATE TABLE IF NOT EXISTS campaign_payouts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  UUID NOT NULL REFERENCES campaigns(id),
  wallet       VARCHAR NOT NULL,
  xp_earned    INTEGER NOT NULL,
  xp_share     NUMERIC(10,6) NOT NULL,
  cc_amount    NUMERIC(20,6) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'PENDING'
               CHECK (status IN ('PENDING','EXECUTED','FAILED','BELOW_MINIMUM')),
  tx_hash      VARCHAR,
  executed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, wallet)
);

-- Add campaign_id to contributions
ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id);

ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS campaign_count INTEGER NOT NULL DEFAULT 1;

-- Add campaign_id to xp_events
ALTER TABLE xp_events
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_participants_wallet ON participants(wallet);
CREATE INDEX IF NOT EXISTS idx_participants_total_xp ON participants(total_xp);
CREATE INDEX IF NOT EXISTS idx_participants_github ON participants(github_handle);
CREATE INDEX IF NOT EXISTS idx_participants_x ON participants(x_handle);

CREATE INDEX IF NOT EXISTS idx_contributions_wallet ON contributions(wallet);
CREATE INDEX IF NOT EXISTS idx_contributions_track ON contributions(track);
CREATE INDEX IF NOT EXISTS idx_contributions_status ON contributions(status);
CREATE INDEX IF NOT EXISTS idx_contributions_pr_number ON contributions(pr_number);
CREATE INDEX IF NOT EXISTS idx_contributions_tweet_id ON contributions(tweet_id);
CREATE INDEX IF NOT EXISTS idx_contributions_external_id ON contributions(external_id);
CREATE INDEX IF NOT EXISTS idx_contributions_campaign ON contributions(campaign_id);

CREATE INDEX IF NOT EXISTS idx_xp_events_wallet ON xp_events(wallet);
CREATE INDEX IF NOT EXISTS idx_xp_events_contribution_id ON xp_events(contribution_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_reason ON xp_events(reason);
CREATE INDEX IF NOT EXISTS idx_xp_events_campaign ON xp_events(campaign_id);

CREATE INDEX IF NOT EXISTS idx_daily_snapshots_wallet ON daily_snapshots(wallet);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date ON daily_snapshots(snapshot_date);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON campaigns(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_cp_campaign ON campaign_participants(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cp_wallet ON campaign_participants(wallet);

CREATE INDEX IF NOT EXISTS idx_payouts_campaign ON campaign_payouts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_payouts_wallet ON campaign_payouts(wallet);
