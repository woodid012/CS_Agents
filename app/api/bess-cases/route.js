import { sql } from '../../../lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'filters';

  const vintage  = searchParams.get('vintage');
  const region   = searchParams.get('region') || 'NSW';
  const duration = searchParams.get('duration') || '1h';
  const scenario = searchParams.get('scenario') || 'base';
  const startYear = searchParams.get('start_year') ? parseInt(searchParams.get('start_year')) : null;
  const degraded  = searchParams.get('degraded') !== 'false';

  try {
    if (type === 'filters') {
      const [vintages, regions, durations, scenarios, startYears] = await Promise.all([
        sql`SELECT DISTINCT vintage FROM bess_investment_cases ORDER BY vintage`,
        sql`SELECT DISTINCT region FROM bess_investment_cases ORDER BY region`,
        sql`SELECT DISTINCT duration FROM bess_investment_cases ORDER BY duration`,
        sql`SELECT DISTINCT scenario_variant FROM bess_investment_cases ORDER BY scenario_variant`,
        sql`SELECT DISTINCT start_year FROM bess_investment_cases ORDER BY start_year`,
      ]);
      return Response.json({
        vintages:   vintages.map((r) => r.vintage),
        regions:    regions.map((r) => r.region),
        durations:  durations.map((r) => r.duration),
        scenarios:  scenarios.map((r) => r.scenario_variant),
        startYears: startYears.map((r) => r.start_year),
      });
    }

    if (type === 'cashflow') {
      const rows = await sql`
        SELECT fy_year, energy_trading_cf, high_price_cf, fcas_cf, total_cf,
               wholesale_discharge_cf, wholesale_charge_cf, major_event_payout, minor_event_payout
        FROM bess_investment_cases
        WHERE vintage = ${vintage} AND region = ${region} AND duration = ${duration}
          AND scenario_variant = ${scenario} AND degraded = ${degraded}
          ${startYear ? sql`AND start_year = ${startYear}` : sql``}
        ORDER BY fy_year
      `;
      return Response.json({ cashflow: rows });
    }

    if (type === 'volume') {
      const rows = await sql`
        SELECT fy_year, discharge_vol, charge_vol
        FROM bess_investment_cases
        WHERE vintage = ${vintage} AND region = ${region} AND duration = ${duration}
          AND scenario_variant = ${scenario} AND degraded = ${degraded}
          ${startYear ? sql`AND start_year = ${startYear}` : sql``}
        ORDER BY fy_year
      `;
      return Response.json({ volume: rows });
    }

    if (type === 'cap_values') {
      const rows = await sql`
        SELECT fy_year, value FROM bess_cap_values
        WHERE vintage = ${vintage} AND region = ${region}
        ORDER BY fy_year
      `;
      return Response.json({ cap_values: rows });
    }

    if (type === 'event_payouts') {
      const rows = await sql`
        SELECT vintage, event_type, duration, value FROM bess_event_payouts
        ${vintage ? sql`WHERE vintage = ${vintage}` : sql``}
        ORDER BY vintage, event_type, duration
      `;
      return Response.json({ event_payouts: rows });
    }

    if (type === 'compare_durations') {
      // Total cashflow per year for each duration, for a given vintage/region/scenario
      const rows = await sql`
        SELECT fy_year, duration, total_cf
        FROM bess_investment_cases
        WHERE vintage = ${vintage} AND region = ${region}
          AND scenario_variant = ${scenario} AND degraded = ${degraded}
          ${startYear ? sql`AND start_year = ${startYear}` : sql``}
        ORDER BY fy_year, duration
      `;
      return Response.json({ compare: rows });
    }

    return Response.json({ error: 'Invalid type' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
