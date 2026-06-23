import { sql } from '../../../lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'monthly';
  const vintage = searchParams.get('vintage');
  const region = searchParams.get('region') || 'NSW';
  const curveType = searchParams.get('curve_type') || 'energy_twa_monthly';
  const duration = searchParams.get('duration') || 'Half-hourly';
  const scenario = searchParams.get('scenario') || 'Central';

  try {
    if (type === 'vintages') {
      const rows = await sql`
        SELECT DISTINCT vintage FROM price_curves_monthly ORDER BY vintage
      `;
      // Return available scenarios too
      const scRows = await sql`
        SELECT DISTINCT scenario FROM price_curves_monthly ORDER BY scenario
      `;
      return Response.json({
        vintages: rows.map((r) => r.vintage),
        scenarios: scRows.map((r) => r.scenario),
      });
    }

    if (type === 'monthly') {
      const curveTypes = curveType.split(',');
      const result = {};
      for (const ct of curveTypes) {
        const rows = await sql`
          SELECT date, value FROM price_curves_monthly
          WHERE vintage = ${vintage} AND region = ${region} AND curve_type = ${ct}
            AND scenario = ${scenario}
          ORDER BY date
        `;
        result[ct] = rows;
      }
      return Response.json(result);
    }

    if (type === 'spreads') {
      // Spreads are Central-only (from the Central scenario sheet)
      const rows = await sql`
        SELECT year, duration, value FROM price_curves_spreads
        WHERE vintage = ${vintage} AND region = ${region}
        ORDER BY year, duration
      `;
      return Response.json({ spreads: rows });
    }

    if (type === 'lgc') {
      // LGC is Central-only (from the inputs sheet)
      const rows = await sql`
        SELECT year, value FROM price_curves_lgc
        WHERE vintage = ${vintage}
        ORDER BY year
      `;
      return Response.json({ lgc: rows });
    }

    if (type === 'compare') {
      const ct = curveType || 'energy_twa_monthly';
      const rows = await sql`
        SELECT vintage, date, value FROM price_curves_monthly
        WHERE region = ${region} AND curve_type = ${ct} AND scenario = ${scenario}
        ORDER BY vintage, date
      `;
      return Response.json({ compare: rows });
    }

    return Response.json({ error: 'Invalid type' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
