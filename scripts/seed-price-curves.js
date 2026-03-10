require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const data = require('../data/price curves/database/all_price_curves.json');

const sql = neon(process.env.DATABASE_URL);

const CURVE_TYPES = [
  'energy_twa_monthly',
  'solar_dwa_monthly',
  'wind_dwa_monthly',
  'solar_dwa_monthly_post_curt_0',
  'wind_dwa_monthly_post_curt_0',
  'solar_dwa_monthly_post_curt_lgc',
  'wind_dwa_monthly_post_curt_lgc',
];

async function bulkInsertMonthly(rows) {
  if (rows.length === 0) return;
  const vintages  = rows.map((r) => r.vintage);
  const regions   = rows.map((r) => r.region);
  const curveTypes = rows.map((r) => r.curve_type);
  const dates     = rows.map((r) => r.date);
  const values    = rows.map((r) => r.value);
  await sql`
    INSERT INTO price_curves_monthly (vintage, region, curve_type, date, value)
    SELECT * FROM unnest(
      ${vintages}::text[],
      ${regions}::text[],
      ${curveTypes}::text[],
      ${dates}::text[],
      ${values}::numeric[]
    )
    ON CONFLICT (vintage, region, curve_type, date) DO UPDATE SET value = EXCLUDED.value
  `;
}

async function bulkInsertSpreads(rows) {
  if (rows.length === 0) return;
  const vintages  = rows.map((r) => r.vintage);
  const regions   = rows.map((r) => r.region);
  const durations = rows.map((r) => r.duration);
  const years     = rows.map((r) => r.year);
  const values    = rows.map((r) => r.value);
  await sql`
    INSERT INTO price_curves_spreads (vintage, region, duration, year, value)
    SELECT * FROM unnest(
      ${vintages}::text[],
      ${regions}::text[],
      ${durations}::text[],
      ${years}::int[],
      ${values}::numeric[]
    )
    ON CONFLICT (vintage, region, duration, year) DO UPDATE SET value = EXCLUDED.value
  `;
}

async function bulkInsertLGC(rows) {
  if (rows.length === 0) return;
  const vintages = rows.map((r) => r.vintage);
  const years    = rows.map((r) => r.year);
  const values   = rows.map((r) => r.value);
  await sql`
    INSERT INTO price_curves_lgc (vintage, year, value)
    SELECT * FROM unnest(
      ${vintages}::text[],
      ${years}::int[],
      ${values}::numeric[]
    )
    ON CONFLICT (vintage, year) DO UPDATE SET value = EXCLUDED.value
  `;
}

async function seed() {
  console.log(`Seeding ${data.length} vintages...`);

  for (const vintage of data) {
    const v = vintage.vintage;
    const timeline = vintage.timeline;
    const t0 = Date.now();

    // ── Monthly curves ────────────────────────────────────────────────────────
    const monthlyRows = [];
    for (const curveKey of CURVE_TYPES) {
      const regionMap = vintage[curveKey];
      if (!regionMap) continue;
      for (const [region, values] of Object.entries(regionMap)) {
        for (let i = 0; i < timeline.length; i++) {
          monthlyRows.push({
            vintage: v, region, curve_type: curveKey, date: timeline[i],
            value: values[i] != null ? parseFloat(values[i]) : null,
          });
        }
      }
    }

    // Insert in chunks of 2000 rows
    const CHUNK = 2000;
    for (let i = 0; i < monthlyRows.length; i += CHUNK) {
      await bulkInsertMonthly(monthlyRows.slice(i, i + CHUNK));
      process.stdout.write('.');
    }

    // ── Spreads ───────────────────────────────────────────────────────────────
    const spreadRows = [];
    for (const entry of vintage.spreads || []) {
      const { region, duration, values } = entry;
      for (let i = 0; i < vintage.spread_years.length; i++) {
        spreadRows.push({ vintage: v, region, duration, year: vintage.spread_years[i], value: values[i] != null ? parseFloat(values[i]) : null });
      }
    }
    await bulkInsertSpreads(spreadRows);

    // ── LGC ───────────────────────────────────────────────────────────────────
    const lgcRows = vintage.lgc_years.map((year, i) => ({
      vintage: v, year, value: vintage.lgc_values[i] != null ? parseFloat(vintage.lgc_values[i]) : null,
    }));
    await bulkInsertLGC(lgcRows);

    console.log(` ${v} — ${monthlyRows.length} monthly rows — ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  console.log('Seeding complete.');
}

seed().catch((e) => { console.error(e); process.exit(1); });
