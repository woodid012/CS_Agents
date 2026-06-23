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

-- Master deal / project list. Counterparties (bidders / offtakers / both)
-- can be assigned to multiple projects via counterparty_projects.
CREATE TABLE IF NOT EXISTS projects (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  description  TEXT,
  status       TEXT DEFAULT 'Active',  -- Active, On hold, Closed
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS counterparty_projects (
  counterparty_id  INTEGER NOT NULL REFERENCES counterparties(id) ON DELETE CASCADE,
  project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (counterparty_id, project_id)
);

CREATE INDEX IF NOT EXISTS counterparty_projects_project_idx ON counterparty_projects (project_id);

-- Recent news / market intelligence linked to a counterparty (or general
-- market news when counterparty_id is NULL). Populated by an external
-- Claude routine that does periodic key-term searches; the analytics page
-- reads from this table to flag which counterparties have new activity.
CREATE TABLE IF NOT EXISTS counterparty_news (
  id              SERIAL PRIMARY KEY,
  counterparty_id INTEGER REFERENCES counterparties(id) ON DELETE CASCADE,
  headline        TEXT NOT NULL,
  summary         TEXT,
  url             TEXT,
  source          TEXT,
  published_at    DATE,
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS counterparty_news_cp_idx ON counterparty_news (counterparty_id, published_at DESC);
CREATE INDEX IF NOT EXISTS counterparty_news_published_idx ON counterparty_news (published_at DESC);

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

-- ─────────────────────────────────────────────────────────────────────────
-- Comps research
--   Curated stats/comparables tracked across deals. Intentionally a TALL
--   (entity–attribute–value) shape: one comp_deals row per deal/asset/
--   transaction, and one comp_metrics row per observed stat. The set of
--   metrics is open-ended (valuation, capex, AC/DC/EPC splits, connection &
--   system-strength charges, opex, land/rent, community contributions, …) so a
--   wide fixed-column table would need a migration every time a new comp type
--   is added. The canonical metric taxonomy lives in lib/compsTaxonomy.js.
--   The /api/comps routes create + seed these on first hit (see lib/compsDb.js).
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comp_deals (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  counterparty     TEXT,                 -- buyer / developer / owner
  seller           TEXT,                 -- vendor (M&A comps)
  technology       TEXT,                 -- Solar, Wind, BESS, Solar+BESS, Platform, ...
  deal_type        TEXT,                 -- M&A, Asset acquisition, Development benchmark, EPC, ...
  country          TEXT DEFAULT 'Australia',
  state            TEXT,                 -- NSW, VIC, QLD, SA, WA, TAS, ...
  capacity_mw      NUMERIC,              -- power capacity (for $/MW)
  capacity_mwh     NUMERIC,              -- energy capacity (for $/MWh)
  capacity_mwac    NUMERIC,              -- AC capacity (solar)
  capacity_mwdc    NUMERIC,              -- DC capacity (solar; with MWac gives DC/AC ratio)
  status           TEXT,                 -- Announced, Completed, FID, Operating, Benchmark, ...
  transaction_date DATE,
  currency         TEXT DEFAULT 'AUD',
  source           TEXT,                 -- publisher / source name
  source_url       TEXT,                 -- clean reference link to the source
  confidence       TEXT,                 -- High / Medium / Low / Illustrative
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comp_metrics (
  id          SERIAL PRIMARY KEY,
  deal_id     INTEGER NOT NULL REFERENCES comp_deals(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,             -- taxonomy category key (valuation, capex, financing, ...)
  metric      TEXT NOT NULL,             -- taxonomy metric key (ev_per_mw, capex_per_mwh, debt_total, ...)
  value       NUMERIC,
  unit        TEXT,                      -- $m, $/MW, $/MWh, $/MW/yr, %, x, ratio, ...
  basis       TEXT,                      -- total, per_mw, per_mwh, per_mw_yr, one_off, percent, ...
  source      TEXT,                      -- publisher / source name (falls back to deal source)
  source_url  TEXT,                      -- clean reference link to the source
  confidence  TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comp_metrics_deal_idx   ON comp_metrics (deal_id);
CREATE INDEX IF NOT EXISTS comp_metrics_cat_idx    ON comp_metrics (category);
CREATE INDEX IF NOT EXISTS comp_metrics_metric_idx ON comp_metrics (metric);
