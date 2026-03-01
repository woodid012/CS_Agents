import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await sql`SELECT * FROM price_curves ORDER BY state, scenario, year`;
  return NextResponse.json(rows);
}

export async function POST(req) {
  const { scenario, state, year, energy_price, lgc_price, source, notes } = await req.json();
  const [row] = await sql`
    INSERT INTO price_curves (scenario, state, year, energy_price, lgc_price, source, notes)
    VALUES (${scenario}, ${state}, ${year}, ${energy_price ?? null}, ${lgc_price ?? null}, ${source ?? ''}, ${notes ?? ''})
    RETURNING *
  `;
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req) {
  const { id } = await req.json();
  await sql`DELETE FROM price_curves WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
