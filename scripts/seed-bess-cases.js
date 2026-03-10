require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const sql = neon(process.env.DATABASE_URL);
const DIR = path.join(__dirname, '..', 'data', 'price curves', 'database_investment_cases');

// Parse CSV handling quoted fields with embedded commas and whitespace
function parseCSV(filename) {
  const raw = fs.readFileSync(path.join(DIR, filename), 'utf8');
  const lines = raw.trim().split('\n');
  const header = lines[0].replace(/\r/g, '').split(',').map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const parts = [];
    let cur = '', inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { parts.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    parts.push(cur.trim().replace(/\r/g, ''));
    const obj = {};
    header.forEach((h, i) => { obj[h] = parts[i] ?? ''; });
    return obj;
  }).filter((r) => r[header[0]] !== '');
}

// Remove thousands-separator commas and parse to float
function toNum(s) {
  if (s == null || s === '' || s === 'NA' || s === 'N/A') return null;
  const cleaned = String(s).replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

async function seed() {
  // ── Investment cases summary ───────────────────────────────────────────────
  console.log('Parsing investment_cases_summary.csv...');
  const rows = parseCSV('investment_cases_summary.csv');
  console.log(`  ${rows.length} rows`);

  // Deduplicate by unique key (last row wins)
  const seen = new Map();
  for (const r of rows) {
    const key = `${r.fy_year}|${r.vintage}|${r.region}|${r.duration}|${r.start_year}|${r.degraded}|${r.scenario_variant}`;
    seen.set(key, r);
  }
  const deduped = [...seen.values()];
  console.log(`  After dedup: ${deduped.length} rows`);

  const CHUNK = 500;
  for (let i = 0; i < deduped.length; i += CHUNK) {
    const chunk = deduped.slice(i, i + CHUNK);
    const fy_years      = chunk.map((r) => parseInt(r.fy_year));
    const vintages      = chunk.map((r) => r.vintage);
    const regions       = chunk.map((r) => r.region);
    const durations     = chunk.map((r) => r.duration);
    const start_years   = chunk.map((r) => parseInt(r.start_year));
    const degraded      = chunk.map((r) => r.degraded?.toUpperCase() === 'TRUE');
    const scenarios     = chunk.map((r) => r.scenario_variant);
    const disc_vol      = chunk.map((r) => toNum(r.discharge_vol));
    const chg_vol       = chunk.map((r) => toNum(r.charge_vol));
    const disc_cf       = chunk.map((r) => toNum(r.wholesale_discharge_cf));
    const chg_cf        = chunk.map((r) => toNum(r.wholesale_charge_cf));
    const energy_cf     = chunk.map((r) => toNum(r.energy_trading_cf));
    const high_cf       = chunk.map((r) => toNum(r.high_price_cf));
    const fcas_cf       = chunk.map((r) => toNum(r.fcas_cf));
    const total_cf      = chunk.map((r) => toNum(r.total_cf));
    const maj_payout    = chunk.map((r) => toNum(r.major_event_payout));
    const min_payout    = chunk.map((r) => toNum(r.minor_event_payout));

    await sql`
      INSERT INTO bess_investment_cases
        (fy_year, vintage, region, duration, start_year, degraded, scenario_variant,
         discharge_vol, charge_vol, wholesale_discharge_cf, wholesale_charge_cf,
         energy_trading_cf, high_price_cf, fcas_cf, total_cf, major_event_payout, minor_event_payout)
      SELECT * FROM unnest(
        ${fy_years}::int[], ${vintages}::text[], ${regions}::text[], ${durations}::text[],
        ${start_years}::int[], ${degraded}::boolean[], ${scenarios}::text[],
        ${disc_vol}::numeric[], ${chg_vol}::numeric[], ${disc_cf}::numeric[],
        ${chg_cf}::numeric[], ${energy_cf}::numeric[], ${high_cf}::numeric[],
        ${fcas_cf}::numeric[], ${total_cf}::numeric[], ${maj_payout}::numeric[], ${min_payout}::numeric[]
      )
      ON CONFLICT (fy_year, vintage, region, duration, start_year, degraded, scenario_variant)
      DO UPDATE SET
        discharge_vol = EXCLUDED.discharge_vol, charge_vol = EXCLUDED.charge_vol,
        wholesale_discharge_cf = EXCLUDED.wholesale_discharge_cf, wholesale_charge_cf = EXCLUDED.wholesale_charge_cf,
        energy_trading_cf = EXCLUDED.energy_trading_cf, high_price_cf = EXCLUDED.high_price_cf,
        fcas_cf = EXCLUDED.fcas_cf, total_cf = EXCLUDED.total_cf,
        major_event_payout = EXCLUDED.major_event_payout, minor_event_payout = EXCLUDED.minor_event_payout
    `;
    process.stdout.write('.');
  }
  console.log(' done');

  // ── Cap values ────────────────────────────────────────────────────────────
  console.log('Parsing cap_values.csv...');
  const capRows = parseCSV('cap_values.csv');
  const cap_fy    = capRows.map((r) => parseInt(r.fy_year));
  const cap_v     = capRows.map((r) => r.vintage);
  const cap_r     = capRows.map((r) => r.region);
  const cap_val   = capRows.map((r) => toNum(r.value));
  await sql`
    INSERT INTO bess_cap_values (fy_year, vintage, region, value)
    SELECT * FROM unnest(${cap_fy}::int[], ${cap_v}::text[], ${cap_r}::text[], ${cap_val}::numeric[])
    ON CONFLICT (fy_year, vintage, region) DO UPDATE SET value = EXCLUDED.value
  `;
  console.log(`  ${capRows.length} rows done`);

  // ── Event payouts ─────────────────────────────────────────────────────────
  console.log('Parsing event_payouts.csv...');
  const evRows = parseCSV('event_payouts.csv');
  const ev_v    = evRows.map((r) => r.vintage);
  const ev_et   = evRows.map((r) => r.event_type);
  const ev_dur  = evRows.map((r) => r.duration);
  const ev_u    = evRows.map((r) => r.units);
  const ev_val  = evRows.map((r) => toNum(r.value));
  await sql`
    INSERT INTO bess_event_payouts (vintage, event_type, duration, units, value)
    SELECT * FROM unnest(${ev_v}::text[], ${ev_et}::text[], ${ev_dur}::text[], ${ev_u}::text[], ${ev_val}::numeric[])
    ON CONFLICT (vintage, event_type, duration) DO UPDATE SET value = EXCLUDED.value
  `;
  console.log(`  ${evRows.length} rows done`);

  console.log('Seeding complete.');
}

seed().catch((e) => { console.error(e); process.exit(1); });
