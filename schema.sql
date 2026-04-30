-- CS Capital CRM — Neon PostgreSQL Schema
-- Run this in your Neon SQL editor to create all tables

-- Bidder AI data
-- Replaces: ai-insights.json, ai-tier-scores.json, merged-insights.json
CREATE TABLE IF NOT EXISTS bidder_ai_data (
  bidder_no        INTEGER PRIMARY KEY,
  ai_insights      TEXT,
  merged_insights  TEXT,
  ai_score         INTEGER DEFAULT 0,
  ai_label         TEXT DEFAULT '-',
  ai_score_reason  TEXT,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Bidder insight status (accept/reject decisions)
-- Replaces: ai-insights-status.json
CREATE TABLE IF NOT EXISTS bidder_insight_status (
  bidder_no   INTEGER PRIMARY KEY,
  status      TEXT CHECK (status IN ('pending', 'accepted', 'rejected')),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Offtaker AI data
-- Replaces: offtaker-insights.json
CREATE TABLE IF NOT EXISTS offtaker_ai_data (
  offtaker_no  INTEGER PRIMARY KEY,
  ai_insights  TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Offtaker insight status (accept/reject decisions)
-- Replaces: offtaker-insights-status.json
CREATE TABLE IF NOT EXISTS offtaker_insight_status (
  offtaker_no  INTEGER PRIMARY KEY,
  status       TEXT CHECK (status IN ('pending', 'accepted', 'rejected')),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts
-- Replaces: contacts.json
CREATE TABLE IF NOT EXISTS contacts (
  bidder_no   INTEGER PRIMARY KEY,
  contact     TEXT,
  email       TEXT,
  phone       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Market Data: Price Curves
CREATE TABLE IF NOT EXISTS price_curves (
  id           SERIAL PRIMARY KEY,
  scenario     TEXT NOT NULL DEFAULT 'Base',
  state        TEXT NOT NULL,
  year         INTEGER NOT NULL,
  energy_price NUMERIC(10,2),
  lgc_price    NUMERIC(10,2),
  source       TEXT,
  notes        TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Project Capex: ingested from Excel files
CREATE TABLE IF NOT EXISTS data_capex (
  id           SERIAL PRIMARY KEY,
  file_name    TEXT,
  reference    TEXT,
  name         TEXT,
  type         TEXT,       -- capex, opex, finance, devex, other, etc.
  value        NUMERIC,
  unit         TEXT,
  uploaded_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Unified counterparties model
--   Replaces split bidder/offtaker tables. A single counterparty can be
--   both a bidder and an offtaker (common for gentailers).
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS counterparties (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  parent_owner  TEXT,
  is_bidder     BOOLEAN NOT NULL DEFAULT FALSE,
  is_offtaker   BOOLEAN NOT NULL DEFAULT FALSE,
  geography     TEXT,                  -- country: Australia, UK, US, ...
  states        TEXT[] DEFAULT '{}',   -- AU states: NSW, VIC, QLD, SA, WA, TAS
  tier          INTEGER,               -- 1/2/3, bidder context (nullable)
  archetype     TEXT,                  -- gentailer, IPP, fund, corporate, retailer, utility, ...
  status        TEXT,                  -- active, passed, not_engaged
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS counterparties_name_idx ON counterparties (LOWER(name));
CREATE INDEX IF NOT EXISTS counterparties_is_bidder_idx ON counterparties (is_bidder) WHERE is_bidder;
CREATE INDEX IF NOT EXISTS counterparties_is_offtaker_idx ON counterparties (is_offtaker) WHERE is_offtaker;

CREATE TABLE IF NOT EXISTS meetings (
  id               SERIAL PRIMARY KEY,
  counterparty_id  INTEGER NOT NULL REFERENCES counterparties(id) ON DELETE CASCADE,
  meeting_date     DATE,
  attendees        TEXT,
  notes            TEXT,
  next_steps       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS meetings_counterparty_idx ON meetings (counterparty_id, meeting_date DESC);

-- Market Data: Capex / Opex benchmarks
CREATE TABLE IF NOT EXISTS capex_opex (
  id              SERIAL PRIMARY KEY,
  technology      TEXT NOT NULL,
  scale_mw        NUMERIC(10,1),
  capex_per_mw    NUMERIC(12,0),
  opex_per_mw_yr  NUMERIC(10,0),
  region          TEXT,
  reference_year  INTEGER,
  source          TEXT,
  notes           TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
