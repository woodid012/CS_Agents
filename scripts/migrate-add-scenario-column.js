require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('Adding scenario column to price_curves_monthly...');

  // Add scenario column (idempotent — ignore error if already exists)
  try {
    await sql`ALTER TABLE price_curves_monthly ADD COLUMN scenario TEXT NOT NULL DEFAULT 'Central'`;
    console.log('  Added scenario column ✓');
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('  scenario column already exists, skipping');
    } else {
      throw e;
    }
  }

  // Drop old unique constraint and recreate including scenario
  try {
    await sql`ALTER TABLE price_curves_monthly DROP CONSTRAINT IF EXISTS price_curves_monthly_vintage_region_curve_type_date_key`;
    console.log('  Dropped old unique constraint ✓');
  } catch (e) {
    console.log('  Could not drop constraint (may not exist):', e.message);
  }

  try {
    await sql`
      ALTER TABLE price_curves_monthly
      ADD CONSTRAINT price_curves_monthly_vintage_region_curve_type_date_scenario_key
      UNIQUE (vintage, region, curve_type, date, scenario)
    `;
    console.log('  Added new unique constraint (includes scenario) ✓');
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('  Unique constraint already exists, skipping');
    } else {
      throw e;
    }
  }

  console.log('Migration complete.');
}

migrate().catch((e) => { console.error(e); process.exit(1); });
