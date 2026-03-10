require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('Creating price curves tables...');

  await sql`
    CREATE TABLE IF NOT EXISTS price_curves_monthly (
      id SERIAL PRIMARY KEY,
      vintage TEXT NOT NULL,
      region TEXT NOT NULL,
      curve_type TEXT NOT NULL,
      date TEXT NOT NULL,
      value NUMERIC,
      UNIQUE(vintage, region, curve_type, date)
    )
  `;
  console.log('  price_curves_monthly ✓');

  await sql`
    CREATE TABLE IF NOT EXISTS price_curves_spreads (
      id SERIAL PRIMARY KEY,
      vintage TEXT NOT NULL,
      region TEXT NOT NULL,
      duration TEXT NOT NULL,
      year INTEGER NOT NULL,
      value NUMERIC,
      UNIQUE(vintage, region, duration, year)
    )
  `;
  console.log('  price_curves_spreads ✓');

  await sql`
    CREATE TABLE IF NOT EXISTS price_curves_lgc (
      id SERIAL PRIMARY KEY,
      vintage TEXT NOT NULL,
      year INTEGER NOT NULL,
      value NUMERIC,
      UNIQUE(vintage, year)
    )
  `;
  console.log('  price_curves_lgc ✓');

  console.log('Migration complete.');
}

migrate().catch((e) => { console.error(e); process.exit(1); });
