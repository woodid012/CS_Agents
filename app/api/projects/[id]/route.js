import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

const FIELDS = ['name', 'description', 'status'];

export async function PATCH(req, { params }) {
  const id = Number(params.id);
  const body = await req.json();

  const updates = {};
  for (const f of FIELDS) {
    if (f in body) updates[f] = body[f] === '' ? null : body[f];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  }

  for (const [field, value] of Object.entries(updates)) {
    switch (field) {
      case 'name':        await sql`UPDATE projects SET name=${value}, updated_at=NOW() WHERE id=${id}`; break;
      case 'description': await sql`UPDATE projects SET description=${value}, updated_at=NOW() WHERE id=${id}`; break;
      case 'status':      await sql`UPDATE projects SET status=${value}, updated_at=NOW() WHERE id=${id}`; break;
    }
  }

  const rows = await sql`SELECT * FROM projects WHERE id = ${id}`;
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req, { params }) {
  const id = Number(params.id);
  await sql`DELETE FROM projects WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
