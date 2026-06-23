// Shared schema-ensure + idempotent seed for the comps research tables.
// Imported by the /api/comps routes (so the tables self-create on first hit,
// mirroring how /api/projects works) and by scripts/seed-comps.mjs.

import { sql } from './db';
import { COMP_DEALS_SEED } from './compsSeed';
import { categoryForMetric } from './compsTaxonomy';

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
      source           TEXT,
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
      confidence  TEXT,
      notes       TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS comp_metrics_deal_idx ON comp_metrics (deal_id)`;
  await sql`CREATE INDEX IF NOT EXISTS comp_metrics_cat_idx ON comp_metrics (category)`;
  await sql`CREATE INDEX IF NOT EXISTS comp_metrics_metric_idx ON comp_metrics (metric)`;
}

// Insert the starter dataset only when the table is empty. Returns rows seeded.
export async function seedCompsIfEmpty() {
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM comp_deals`;
  if (count > 0) return 0;
  return seedComps();
}

// Force-insert the seed set (used by the standalone script). Not idempotent on
// its own — callers guard with seedCompsIfEmpty or a fresh table.
export async function seedComps() {
  let n = 0;
  for (const d of COMP_DEALS_SEED) {
    const [deal] = await sql`
      INSERT INTO comp_deals
        (name, counterparty, seller, technology, deal_type, state, capacity_mw,
         capacity_mwh, capacity_mwac, capacity_mwdc, status, transaction_date,
         currency, source, confidence, notes)
      VALUES
        (${d.name}, ${d.counterparty ?? null}, ${d.seller ?? null}, ${d.technology ?? null},
         ${d.deal_type ?? null}, ${d.state ?? null}, ${d.capacity_mw ?? null},
         ${d.capacity_mwh ?? null}, ${d.capacity_mwac ?? null}, ${d.capacity_mwdc ?? null},
         ${d.status ?? null}, ${d.transaction_date ?? null}, ${d.currency ?? 'AUD'},
         ${d.source ?? null}, ${d.confidence ?? null}, ${d.notes ?? null})
      RETURNING id
    `;
    for (const m of d.metrics || []) {
      await sql`
        INSERT INTO comp_metrics (deal_id, category, metric, value, unit, basis, source, confidence, notes)
        VALUES (${deal.id}, ${categoryForMetric(m.metric)}, ${m.metric}, ${m.value ?? null},
                ${m.unit ?? null}, ${m.basis ?? null}, ${m.source ?? null},
                ${m.confidence ?? null}, ${m.notes ?? null})
      `;
    }
    n++;
  }
  return n;
}
