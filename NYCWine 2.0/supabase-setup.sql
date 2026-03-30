-- NYCWine.com — Supabase table setup
-- Run this in Supabase → SQL Editor

-- ── 1. Submissions (free listing form) ───────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id            TEXT PRIMARY KEY,
  type          TEXT NOT NULL,        -- event / bar / store / winery
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'new',  -- new / reviewed-posted / reviewed-rejected / reviewed-escalated
  contact_email TEXT,
  ai_verdict    TEXT,
  ai_reason     TEXT,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  flagged_at    TIMESTAMPTZ,
  approved_at   TIMESTAMPTZ,
  rejected_at   TIMESTAMPTZ,
  data          JSONB        -- all other fields (address, date, url, etc.)
);

-- ── 2. Ad bookings (Stripe checkout) ─────────────────────────
CREATE TABLE IF NOT EXISTS ad_bookings (
  id                TEXT PRIMARY KEY,
  stripe_session_id TEXT,
  slot_id           TEXT NOT NULL,    -- header / event / bar / store / winery / sidebar / social
  tier_key          TEXT NOT NULL,    -- monthly / quarterly / annual
  start_month       TEXT NOT NULL,    -- YYYY-MM
  advertiser_name   TEXT,
  contact_email     TEXT,
  website_url       TEXT,
  status            TEXT NOT NULL DEFAULT 'pending_payment',  -- pending_payment / active / cancelled
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  activated_at      TIMESTAMPTZ,
  data              JSONB             -- ad_image_url, logo_url, description, etc.
);

-- ── 3. Submitted events (approved, shown on homepage feed) ───
CREATE TABLE IF NOT EXISTS submitted_events (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  venue         TEXT,
  venue_address TEXT,
  date          TEXT,
  time          TEXT,
  price         TEXT,
  description   TEXT,
  url           TEXT,
  image         TEXT,
  source        TEXT DEFAULT 'NYCWine',
  submitted_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row-level security (allow anon reads for public data) ────
ALTER TABLE submitted_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read submitted_events"
  ON submitted_events FOR SELECT USING (true);

-- submissions and ad_bookings are server-only (anon key can insert, not read)
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow insert submissions"
  ON submissions FOR INSERT WITH CHECK (true);

ALTER TABLE ad_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow insert ad_bookings"
  ON ad_bookings FOR INSERT WITH CHECK (true);
