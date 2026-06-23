import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { ensureCompsSchema } from '../../../../lib/compsDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureCompsSchema();
    const rows = await sql`
      SELECT d.*,
        (SELECT COUNT(*)::int FROM comp_metrics m WHERE m.deal_id = d.id) AS metric_count
      FROM comp_deals d
      ORDER BY d.transaction_date DESC NULLS LAST, d.name ASC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/comps/deals failed:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureCompsSchema();
    const b = await req.json();
    if (!b.name || !b.name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const num = (v) => (v === '' || v == null ? null : Number(v));
    const [row] = await sql`
      INSERT INTO comp_deals
        (name, counterparty, seller, technology, deal_type, state, capacity_mw,
         capacity_mwh, capacity_mwac, capacity_mwdc, status, transaction_date,
         currency, scheme, program, source, source_url, confidence, notes)
      VALUES
        (${b.name.trim()}, ${b.counterparty || null}, ${b.seller || null}, ${b.technology || null},
         ${b.deal_type || null}, ${b.state || null}, ${num(b.capacity_mw)},
         ${num(b.capacity_mwh)}, ${num(b.capacity_mwac)}, ${num(b.capacity_mwdc)},
         ${b.status || null}, ${b.transaction_date || null}, ${b.currency || 'AUD'},
         ${b.scheme || null}, ${b.program || null}, ${b.source || null}, ${b.source_url || null}, ${b.confidence || null}, ${b.notes || null})
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error('POST /api/comps/deals failed:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    await sql`DELETE FROM comp_deals WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/comps/deals failed:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
