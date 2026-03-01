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
