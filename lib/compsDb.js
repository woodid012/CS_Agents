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
      status           TEXT,
      transaction_date DATE,
      date_added       DATE,
      data_class       TEXT,
      currency         TEXT DEFAULT 'AUD',
      scheme           TEXT,
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
  await sql`ALTER TABLE comp_deals   ADD COLUMN IF NOT EXISTS scheme TEXT`;
  await sql`ALTER TABLE comp_deals   ADD COLUMN IF NOT EXISTS date_added DATE`;
  await sql`ALTER TABLE comp_deals   ADD COLUMN IF NOT EXISTS data_class TEXT`;
  await sql`ALTER TABLE comp_metrics ADD COLUMN IF NOT EXISTS source_url TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS comp_metrics_deal_idx   ON comp_metrics (deal_id)`;
  await sql`CREATE INDEX IF NOT EXISTS comp_metrics_cat_idx    ON comp_metrics (category)`;
  await sql`CREATE INDEX IF NOT EXISTS comp_metrics_metric_idx ON comp_metrics (metric)`;
}

// Insert one deal (+ its metrics) and return the new id.
async function insertOneDeal(d) {
  const [deal] = await sql`
    INSERT INTO comp_deals
      (name, counterparty, seller, technology, deal_type, state, capacity_mw,
       capacity_mwh, capacity_mwac, status, transaction_date,
       date_added, data_class, currency, scheme, program, source, source_url, confidence, notes)
    VALUES
      (${d.name}, ${d.counterparty ?? null}, ${d.seller ?? null}, ${d.technology ?? null},
       ${d.deal_type ?? null}, ${d.state ?? null}, ${d.capacity_mw ?? null},
       ${d.capacity_mwh ?? null}, ${d.capacity_mwac ?? null},
       ${d.status ?? null}, ${d.transaction_date ?? null}, ${d.date_added ?? null}, ${d.data_class ?? null}, ${d.currency ?? 'AUD'},
       ${d.scheme ?? null}, ${d.program ?? null}, ${d.source ?? null}, ${d.source_url ?? null},
       ${d.confidence ?? null}, ${d.notes ?? null})
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
  return deal.id;
}

// Manual "Refresh data": refresh every dataset deal from the JSON (delete
// same-name + re-insert, picking up changed values). Leaves UI-added deals
// (not in the dataset) untouched. The ONLY thing that writes the dataset to the
// DB — there is no automatic sync on page load.
export async function resyncDealsFull() {
  let n = 0;
  for (const d of SEED_DEALS) {
    await sql`DELETE FROM comp_deals WHERE name = ${d.name}`;
    await insertOneDeal(d);
    n++;
  }
  return n;
}
