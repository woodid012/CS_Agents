require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  // Check min fy_year for each start_year that needed fixing
  const minFy = await sql`
    SELECT start_year, MIN(fy_year) as min_fy
    FROM bess_investment_cases
    WHERE start_year IN (2027, 2029)
    GROUP BY start_year ORDER BY start_year
  `;
  console.log('Current min fy_year per start_year:');
  minFy.forEach((r) => console.log(`  start_year=${r.start_year}  min_fy=${r.min_fy}`));

  for (const { start_year, min_fy } of minFy) {
    const expectedMinFy = start_year;
    if (parseInt(min_fy) === expectedMinFy) {
      console.log(`\nstart_year=${start_year}: min_fy already correct (${min_fy}) — skipping`);
      continue;
    }

    const offset = parseInt(min_fy) - expectedMinFy;
    console.log(`\nstart_year=${start_year}: min_fy=${min_fy}, expected=${expectedMinFy}, shifting by -${offset}`);

    // Step 1: move to temp range
    await sql`UPDATE bess_investment_cases SET fy_year = fy_year + 10000 WHERE start_year = ${start_year}`;
    console.log(`  Moved to temp range (+10000)`);

    // Step 2: shift back by correct offset
    await sql`UPDATE bess_investment_cases SET fy_year = fy_year - ${10000 + offset} WHERE start_year = ${start_year}`;
    console.log(`  Shifted back by ${offset}`);
  }

  // Final verification
  console.log('\n── Final state ──');
  for (const sy of [2027, 2029]) {
    const rows = await sql`
      SELECT fy_year, AVG(total_cf::numeric) as avg_cf
      FROM bess_investment_cases WHERE start_year = ${sy}
      GROUP BY fy_year ORDER BY fy_year LIMIT 4
    `;
    console.log(`start_year=${sy}:`);
    rows.forEach((r) => console.log(`  fy_year=${r.fy_year}  avg_cf=${parseFloat(r.avg_cf).toFixed(0)}`));
  }
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
