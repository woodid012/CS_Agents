import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await sql`SELECT * FROM capex_opex ORDER BY technology, scale_mw`;
  return NextResponse.json(rows);
}

export async function POST(req) {
  const { technology, scale_mw, capex_per_mw, opex_per_mw_yr, region, reference_year, source, notes } = await req.json();
  const [row] = await sql`
    INSERT INTO capex_opex (technology, scale_mw, capex_per_mw, opex_per_mw_yr, region, reference_year, source, notes)
    VALUES (
      ${technology}, ${scale_mw ?? null}, ${capex_per_mw ?? null}, ${opex_per_mw_yr ?? null},
      ${region ?? ''}, ${reference_year ?? null}, ${source ?? ''}, ${notes ?? ''}
    )
    RETURNING *
  `;
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req) {
  const { id } = await req.json();
  await sql`DELETE FROM capex_opex WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
