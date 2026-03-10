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
      const region2   = searchParams.get('region');
      const duration2 = searchParams.get('duration');
      const scenario2 = searchParams.get('scenario');
      const startYear2 = searchParams.get('start_year') ? parseInt(searchParams.get('start_year')) : null;

      // Vintages: always all
      const vintageRows = await sql`SELECT DISTINCT vintage FROM bess_investment_cases ORDER BY vintage`;

      // Each level scoped by all upstream selections
      const regionRows = await sql`
        SELECT DISTINCT region FROM bess_investment_cases
        WHERE TRUE
          ${vintage   ? sql`AND vintage = ${vintage}`     : sql``}
        ORDER BY region
      `;

      const durationRows = await sql`
        SELECT DISTINCT duration FROM bess_investment_cases
        WHERE TRUE
          ${vintage ? sql`AND vintage = ${vintage}` : sql``}
          ${region2 ? sql`AND region  = ${region2}` : sql``}
        ORDER BY duration
      `;

      const scenarioRows = await sql`
        SELECT DISTINCT scenario_variant FROM bess_investment_cases
        WHERE TRUE
          ${vintage   ? sql`AND vintage  = ${vintage}`   : sql``}
          ${region2   ? sql`AND region   = ${region2}`   : sql``}
          ${duration2 ? sql`AND duration = ${duration2}` : sql``}
        ORDER BY scenario_variant
      `;

      const startYearRows = await sql`
        SELECT DISTINCT start_year FROM bess_investment_cases
        WHERE TRUE
          ${vintage   ? sql`AND vintage          = ${vintage}`   : sql``}
          ${region2   ? sql`AND region           = ${region2}`   : sql``}
          ${duration2 ? sql`AND duration         = ${duration2}` : sql``}
          ${scenario2 ? sql`AND scenario_variant = ${scenario2}` : sql``}
        ORDER BY start_year
      `;

      const degradedRows = await sql`
        SELECT DISTINCT degraded FROM bess_investment_cases
        WHERE TRUE
          ${vintage    ? sql`AND vintage          = ${vintage}`    : sql``}
          ${region2    ? sql`AND region           = ${region2}`    : sql``}
          ${duration2  ? sql`AND duration         = ${duration2}`  : sql``}
          ${scenario2  ? sql`AND scenario_variant = ${scenario2}`  : sql``}
          ${startYear2 ? sql`AND start_year       = ${startYear2}` : sql``}
        ORDER BY degraded
      `;

      return Response.json({
        vintages:        vintageRows.map((r) => r.vintage),
        regions:         regionRows.map((r) => r.region),
        durations:       durationRows.map((r) => r.duration),
        scenarios:       scenarioRows.map((r) => r.scenario_variant),
        startYears:      startYearRows.map((r) => r.start_year),
        degradedOptions: degradedRows.map((r) => r.degraded),
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

    if (type === 'compare_vintages') {
      // Total cashflow per year across all vintages for a given region/duration/scenario/start_year/degraded
      const rows = await sql`
        SELECT fy_year, vintage, total_cf
        FROM bess_investment_cases
        WHERE region = ${region} AND duration = ${duration}
          AND scenario_variant = ${scenario} AND degraded = ${degraded}
          ${startYear ? sql`AND start_year = ${startYear}` : sql``}
        ORDER BY fy_year, vintage
      `;
      return Response.json({ compare: rows });
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
