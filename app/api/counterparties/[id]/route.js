import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

const FIELDS = [
  'name', 'parent_owner', 'is_bidder', 'is_offtaker',
  'geography', 'states', 'tier', 'archetype', 'status', 'notes',
];

export async function GET(_req, { params }) {
  const id = Number(params.id);
  const rows = await sql`SELECT * FROM counterparties WHERE id = ${id}`;
  if (rows.length === 0) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PATCH(req, { params }) {
  const id = Number(params.id);
  const body = await req.json();

  // Apply only the fields supplied in the body
  const updates = {};
  for (const f of FIELDS) {
    if (f in body) updates[f] = body[f];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  }

  // Coerce booleans / arrays / numbers
  if ('is_bidder' in updates) updates.is_bidder = !!updates.is_bidder;
  if ('is_offtaker' in updates) updates.is_offtaker = !!updates.is_offtaker;
  if ('tier' in updates) updates.tier = updates.tier === '' || updates.tier == null ? null : Number(updates.tier);
  if ('states' in updates) updates.states = Array.isArray(updates.states) ? updates.states : [];
  for (const f of ['name', 'parent_owner', 'geography', 'archetype', 'status', 'notes']) {
    if (f in updates) {
      const v = updates[f];
      updates[f] = v == null || v === '' ? null : String(v);
    }
  }

  // Build dynamic UPDATE — Neon's tagged-template doesn't compose well, so emit
  // one UPDATE per supplied field. Small N, simple, safe.
  for (const [field, value] of Object.entries(updates)) {
    switch (field) {
      case 'name':         await sql`UPDATE counterparties SET name=${value}, updated_at=NOW() WHERE id=${id}`; break;
      case 'parent_owner': await sql`UPDATE counterparties SET parent_owner=${value}, updated_at=NOW() WHERE id=${id}`; break;
      case 'is_bidder':    await sql`UPDATE counterparties SET is_bidder=${value}, updated_at=NOW() WHERE id=${id}`; break;
      case 'is_offtaker':  await sql`UPDATE counterparties SET is_offtaker=${value}, updated_at=NOW() WHERE id=${id}`; break;
      case 'geography':    await sql`UPDATE counterparties SET geography=${value}, updated_at=NOW() WHERE id=${id}`; break;
      case 'states':       await sql`UPDATE counterparties SET states=${value}, updated_at=NOW() WHERE id=${id}`; break;
      case 'tier':         await sql`UPDATE counterparties SET tier=${value}, updated_at=NOW() WHERE id=${id}`; break;
      case 'archetype':    await sql`UPDATE counterparties SET archetype=${value}, updated_at=NOW() WHERE id=${id}`; break;
      case 'status':       await sql`UPDATE counterparties SET status=${value}, updated_at=NOW() WHERE id=${id}`; break;
      case 'notes':        await sql`UPDATE counterparties SET notes=${value}, updated_at=NOW() WHERE id=${id}`; break;
    }
  }

  const rows = await sql`SELECT * FROM counterparties WHERE id = ${id}`;
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req, { params }) {
  const id = Number(params.id);
  await sql`DELETE FROM counterparties WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
