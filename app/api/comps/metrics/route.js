import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { ensureCompsSchema, seedCompsIfEmpty } from '../../../../lib/compsDb';
import { categoryForMetric } from '../../../../lib/compsTaxonomy';

export const dynamic = 'force-dynamic';

// Returns every metric observation joined with its deal so the UI can group,
// filter and normalise (per-MW / per-MWh) without a second round-trip.
export async function GET(req) {
  try {
    await ensureCompsSchema();
    await seedCompsIfEmpty();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const dealId = searchParams.get('deal_id');

    const rows = await sql`
      SELECT m.*,
             d.name AS deal_name, d.technology, d.deal_type, d.state, d.scheme, d.program,
             d.capacity_mw, d.capacity_mwh, d.transaction_date, d.currency
      FROM comp_metrics m
      JOIN comp_deals d ON d.id = m.deal_id
      WHERE TRUE
        ${category ? sql`AND m.category = ${category}` : sql``}
        ${dealId ? sql`AND m.deal_id = ${Number(dealId)}` : sql``}
      ORDER BY m.category, d.name, m.metric
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/comps/metrics failed:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureCompsSchema();
    const b = await req.json();
    if (!b.deal_id) return NextResponse.json({ error: 'deal_id is required' }, { status: 400 });
    if (!b.metric) return NextResponse.json({ error: 'metric is required' }, { status: 400 });
    const category = b.category || categoryForMetric(b.metric);
    const value = b.value === '' || b.value == null ? null : Number(b.value);
    const [row] = await sql`
      INSERT INTO comp_metrics (deal_id, category, metric, value, unit, basis, source, source_url, confidence, notes)
      VALUES (${Number(b.deal_id)}, ${category}, ${b.metric}, ${value},
              ${b.unit || null}, ${b.basis || null}, ${b.source || null},
              ${b.source_url || null}, ${b.confidence || null}, ${b.notes || null})
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error('POST /api/comps/metrics failed:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    await sql`DELETE FROM comp_metrics WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/comps/metrics failed:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
