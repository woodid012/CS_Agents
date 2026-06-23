/**
 * Seed Low and Messy Transition scenario data from all_price_curves.json
 * into price_curves_monthly.
 *
 * Run AFTER:
 *   1. python extract_price_curves.py  (in Aurora_scrape/)
 *   2. copy Aurora_scrape/database/all_price_curves.json → data/price curves/database/
 *   3. node scripts/migrate-add-scenario-column.js
 */
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const data = require('../data/price curves/database/all_price_curves.json');

const sql = neon(process.env.DATABASE_URL);

const SCENARIO_CURVE_TYPES = [
  'energy_twa_monthly',
  'solar_dwa_monthly',
  'wind_dwa_monthly',
];

async function bulkInsertMonthly(rows) {
  if (rows.length === 0) return;
  const vintages   = rows.map((r) => r.vintage);
  const scenarios  = rows.map((r) => r.scenario);
  const regions    = rows.map((r) => r.region);
  const curveTypes = rows.map((r) => r.curve_type);
  const dates      = rows.map((r) => r.date);
  const values     = rows.map((r) => r.value);
  await sql`
    INSERT INTO price_curves_monthly (vintage, scenario, region, curve_type, date, value)
    SELECT * FROM unnest(
      ${vintages}::text[],
      ${scenarios}::text[],
      ${regions}::text[],
      ${curveTypes}::text[],
      ${dates}::text[],
      ${values}::numeric[]
    )
    ON CONFLICT (vintage, region, curve_type, date, scenario)
    DO UPDATE SET value = EXCLUDED.value
  `;
}

async function seed() {
  const vintagesWithScenarios = data.filter((v) => v.scenarios && Object.keys(v.scenarios).length > 0);
  console.log(`Found ${vintagesWithScenarios.length} vintages with scenario data (out of ${data.length} total)`);

  for (const vintage of data) {
    const v = vintage.vintage;
    const scenariosData = vintage.scenarios || {};
    const scenarioNames = Object.keys(scenariosData);

    if (scenarioNames.length === 0) {
      console.log(`  ${v} — no scenario data, skipping`);
      continue;
    }

    const t0 = Date.now();
    const monthlyRows = [];

    for (const [scenario, scData] of Object.entries(scenariosData)) {
      const timeline = scData.timeline || [];
      for (const curveKey of SCENARIO_CURVE_TYPES) {
        const regionMap = scData[curveKey];
        if (!regionMap) continue;
        for (const [region, values] of Object.entries(regionMap)) {
          for (let i = 0; i < timeline.length; i++) {
            const val = values[i];
            monthlyRows.push({
              vintage: v,
              scenario,
              region,
              curve_type: curveKey,
              date: timeline[i],
              value: val != null && val !== '-' ? parseFloat(val) : null,
            });
          }
        }
      }
    }

    // Insert in chunks
    const CHUNK = 2000;
    for (let i = 0; i < monthlyRows.length; i += CHUNK) {
      await bulkInsertMonthly(monthlyRows.slice(i, i + CHUNK));
      process.stdout.write('.');
    }

    console.log(` ${v} — ${scenarioNames.join(', ')} — ${monthlyRows.length} rows — ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  console.log('\nScenario seeding complete.');
}

seed().catch((e) => { console.error(e); process.exit(1); });
