// Shared schema-ensure + idempotent seed for the comps research tables.
// Imported by the /api/comps routes (so the tables self-create + seed on first
// hit, mirroring how /api/projects works). The standalone re-sync loader lives
// in scripts/scrape-comps.js (CommonJS) and reads the same JSON dataset.

import { sql } from './db';
import { categoryForMetric } from './compsTaxonomy';
import compsData from '../data/comps-scrape.json';

const SEED_DEALS = compsData.deals || [];

export async function ensureCompsSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS comp_deals (
      id               SERIAL PRIMARY KEY,
      name             TEXT NOT NULL,
      counterparty     TEXT,
      seller           TEXT,
      technology       TEXT,
      deal_type        TEXT,
      country          TEXT DEFAULT 'Australia',
      state            TEXT,
      capacity_mw      NUMERIC,
      capacity_mwh     NUMERIC,
      capacity_mwac    NUMERIC,
      capacity_mwdc    NUMERIC,
      status           TEXT,
      transaction_date DATE,
      currency         TEXT DEFAULT 'AUD',
      program          TEXT,
      source           TEXT,
      source_url       TEXT,
      confidence       TEXT,
      notes            TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS comp_metrics (
      id          SERIAL PRIMARY KEY,
      deal_id     INTEGER NOT NULL REFERENCES comp_deals(id) ON DELETE CASCADE,
      category    TEXT NOT NULL,
      metric      TEXT NOT NULL,
      value       NUMERIC,
      unit        TEXT,
      basis       TEXT,
      source      TEXT,
      source_url  TEXT,
      confidence  TEXT,
      notes       TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // Backfill columns added after the tables were first created.
  await sql`ALTER TABLE comp_deals   ADD COLUMN IF NOT EXISTS source_url TEXT`;
  await sql`ALTER TABLE comp_deals   ADD COLUMN IF NOT EXISTS program TEXT`;
  await sql`ALTER TABLE comp_metrics ADD COLUMN IF NOT EXISTS source_url TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS comp_metrics_deal_idx   ON comp_metrics (deal_id)`;
  await sql`CREATE INDEX IF NOT EXISTS comp_metrics_cat_idx    ON comp_metrics (category)`;
  await sql`CREATE INDEX IF NOT EXISTS comp_metrics_metric_idx ON comp_metrics (metric)`;
}

// Insert the dataset only when the table is empty.
export async function seedCompsIfEmpty() {
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM comp_deals`;
  if (count > 0) return 0;
  return insertDeals(SEED_DEALS);
}

// Insert an array of deal objects (with nested .metrics). Returns deals inserted.
export async function insertDeals(deals) {
  let n = 0;
  for (const d of deals) {
    const [deal] = await sql`
      INSERT INTO comp_deals
        (name, counterparty, seller, technology, deal_type, state, capacity_mw,
         capacity_mwh, capacity_mwac, capacity_mwdc, status, transaction_date,
         currency, program, source, source_url, confidence, notes)
      VALUES
        (${d.name}, ${d.counterparty ?? null}, ${d.seller ?? null}, ${d.technology ?? null},
         ${d.deal_type ?? null}, ${d.state ?? null}, ${d.capacity_mw ?? null},
         ${d.capacity_mwh ?? null}, ${d.capacity_mwac ?? null}, ${d.capacity_mwdc ?? null},
         ${d.status ?? null}, ${d.transaction_date ?? null}, ${d.currency ?? 'AUD'},
         ${d.program ?? null}, ${d.source ?? null}, ${d.source_url ?? null}, ${d.confidence ?? null}, ${d.notes ?? null})
      RETURNING id
    `;
    for (const m of d.metrics || []) {
      await sql`
        INSERT INTO comp_metrics (deal_id, category, metric, value, unit, basis, source, source_url, confidence, notes)
        VALUES (${deal.id}, ${m.category || categoryForMetric(m.metric)}, ${m.metric}, ${m.value ?? null},
                ${m.unit ?? null}, ${m.basis ?? null}, ${m.source ?? d.source ?? null},
                ${m.source_url ?? d.source_url ?? null}, ${m.confidence ?? null}, ${m.notes ?? null})
      `;
    }
    n++;
  }
  return n;
}
