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
