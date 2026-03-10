import { sql } from '../../../lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'monthly';
  const vintage = searchParams.get('vintage');
  const region = searchParams.get('region') || 'NSW';
  const curveType = searchParams.get('curve_type') || 'energy_twa_monthly';
  const duration = searchParams.get('duration') || 'Half-hourly';

  try {
    if (type === 'vintages') {
      // Return distinct vintages
      const rows = await sql`
        SELECT DISTINCT vintage FROM price_curves_monthly ORDER BY vintage
      `;
      return Response.json({ vintages: rows.map((r) => r.vintage) });
    }

    if (type === 'monthly') {
      // Return monthly curves for selected vintage + region, multiple curve types
      const curveTypes = curveType.split(',');
      const result = {};
      for (const ct of curveTypes) {
        const rows = await sql`
          SELECT date, value FROM price_curves_monthly
          WHERE vintage = ${vintage} AND region = ${region} AND curve_type = ${ct}
          ORDER BY date
        `;
        result[ct] = rows;
      }
      return Response.json(result);
    }

    if (type === 'spreads') {
      const rows = await sql`
        SELECT year, duration, value FROM price_curves_spreads
        WHERE vintage = ${vintage} AND region = ${region}
        ORDER BY year, duration
      `;
      return Response.json({ spreads: rows });
    }

    if (type === 'lgc') {
      const rows = await sql`
        SELECT year, value FROM price_curves_lgc
        WHERE vintage = ${vintage}
        ORDER BY year
      `;
      return Response.json({ lgc: rows });
    }

    if (type === 'compare') {
      // Multi-vintage comparison for a single curve_type + region
      const ct = curveType || 'energy_twa_monthly';
      const rows = await sql`
        SELECT vintage, date, value FROM price_curves_monthly
        WHERE region = ${region} AND curve_type = ${ct}
        ORDER BY vintage, date
      `;
      return Response.json({ compare: rows });
    }

    return Response.json({ error: 'Invalid type' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
