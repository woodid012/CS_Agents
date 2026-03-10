require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('Creating BESS investment case tables...');

  await sql`
    CREATE TABLE IF NOT EXISTS bess_investment_cases (
      id SERIAL PRIMARY KEY,
      fy_year INTEGER NOT NULL,
      vintage TEXT NOT NULL,
      region TEXT NOT NULL,
      duration TEXT NOT NULL,
      start_year INTEGER NOT NULL,
      degraded BOOLEAN NOT NULL,
      scenario_variant TEXT NOT NULL,
      discharge_vol NUMERIC,
      charge_vol NUMERIC,
      wholesale_discharge_cf NUMERIC,
      wholesale_charge_cf NUMERIC,
      energy_trading_cf NUMERIC,
      high_price_cf NUMERIC,
      fcas_cf NUMERIC,
      total_cf NUMERIC,
      major_event_payout NUMERIC,
      minor_event_payout NUMERIC,
      UNIQUE(fy_year, vintage, region, duration, start_year, degraded, scenario_variant)
    )
  `;
  console.log('  bess_investment_cases ✓');

  await sql`
    CREATE TABLE IF NOT EXISTS bess_cap_values (
      id SERIAL PRIMARY KEY,
      fy_year INTEGER NOT NULL,
      vintage TEXT NOT NULL,
      region TEXT NOT NULL,
      value NUMERIC,
      UNIQUE(fy_year, vintage, region)
    )
  `;
  console.log('  bess_cap_values ✓');

  await sql`
    CREATE TABLE IF NOT EXISTS bess_event_payouts (
      id SERIAL PRIMARY KEY,
      vintage TEXT NOT NULL,
      event_type TEXT NOT NULL,
      duration TEXT NOT NULL,
      units TEXT,
      value NUMERIC,
      UNIQUE(vintage, event_type, duration)
    )
  `;
  console.log('  bess_event_payouts ✓');

  console.log('Migration complete.');
}

migrate().catch((e) => { console.error(e); process.exit(1); });
