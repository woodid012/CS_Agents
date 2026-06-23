// Load / re-sync the curated public comps dataset into Neon.
//
//   node scripts/scrape-comps.js
//
// Reads data/comps-scrape.json (deals + per-metric rows, each with a source +
// source_url reference) and upserts it. Idempotent: each deal is matched by
// name; an existing deal of the same name is deleted (cascading its metrics)
// and re-inserted, so re-running re-syncs to the JSON without duplicates.
//
// This is the "scraper" sink: web research is captured into the JSON dataset
// (the single source of truth, also used to auto-seed /comps), and this script
// pushes it to the database. Add new scraped rows to the JSON, then re-run.

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const data = require('../data/comps-scrape.json');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set. Add it to .env.local first.');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS comp_deals (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, counterparty TEXT, seller TEXT,
      technology TEXT, deal_type TEXT, country TEXT DEFAULT 'Australia', state TEXT,
      capacity_mw NUMERIC, capacity_mwh NUMERIC, capacity_mwac NUMERIC, capacity_mwdc NUMERIC,
      status TEXT, transaction_date DATE, date_added DATE, data_class TEXT, currency TEXT DEFAULT 'AUD', scheme TEXT, program TEXT, source TEXT,
      source_url TEXT, confidence TEXT, notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS comp_metrics (
      id SERIAL PRIMARY KEY, deal_id INTEGER NOT NULL REFERENCES comp_deals(id) ON DELETE CASCADE,
      category TEXT NOT NULL, metric TEXT NOT NULL, value NUMERIC, unit TEXT, basis TEXT,
      source TEXT, source_url TEXT, confidence TEXT, notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
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

async function run() {
  await ensureSchema();
  const deals = data.deals || [];
  let dealCount = 0;
  let metricCount = 0;

  for (const d of deals) {
    // Re-sync: drop any existing deal of the same name (cascade removes metrics).
    await sql`DELETE FROM comp_deals WHERE name = ${d.name}`;

    const [deal] = await sql`
      INSERT INTO comp_deals
        (name, counterparty, seller, technology, deal_type, state, capacity_mw,
         capacity_mwh, capacity_mwac, capacity_mwdc, status, transaction_date,
         date_added, data_class, currency, scheme, program, source, source_url, confidence, notes)
      VALUES
        (${d.name}, ${d.counterparty ?? null}, ${d.seller ?? null}, ${d.technology ?? null},
         ${d.deal_type ?? null}, ${d.state ?? null}, ${d.capacity_mw ?? null},
         ${d.capacity_mwh ?? null}, ${d.capacity_mwac ?? null}, ${d.capacity_mwdc ?? null},
         ${d.status ?? null}, ${d.transaction_date ?? null}, ${d.date_added ?? null}, ${d.data_class ?? null}, ${d.currency ?? 'AUD'},
         ${d.scheme ?? null}, ${d.program ?? null}, ${d.source ?? null}, ${d.source_url ?? null}, ${d.confidence ?? null}, ${d.notes ?? null})
      RETURNING id`;

    for (const m of d.metrics || []) {
      await sql`
        INSERT INTO comp_metrics (deal_id, category, metric, value, unit, basis, source, source_url, confidence, notes)
        VALUES (${deal.id}, ${m.category || 'other'}, ${m.metric}, ${m.value ?? null},
                ${m.unit ?? null}, ${m.basis ?? null}, ${m.source ?? d.source ?? null},
                ${m.source_url ?? d.source_url ?? null}, ${m.confidence ?? null}, ${m.notes ?? null})`;
      metricCount++;
    }
    dealCount++;
    process.stdout.write('.');
  }

  console.log(`\nSynced ${dealCount} deals and ${metricCount} metric observations from data/comps-scrape.json`);
}

run().catch((e) => { console.error(e); process.exit(1); });
