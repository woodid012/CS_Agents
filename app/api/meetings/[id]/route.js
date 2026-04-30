import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

const FIELDS = ['meeting_date', 'attendees', 'notes', 'next_steps'];

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
      case 'meeting_date': await sql`UPDATE meetings SET meeting_date=${value}, updated_at=NOW() WHERE id=${id}`; break;
      case 'attendees':    await sql`UPDATE meetings SET attendees=${value}, updated_at=NOW() WHERE id=${id}`; break;
      case 'notes':        await sql`UPDATE meetings SET notes=${value}, updated_at=NOW() WHERE id=${id}`; break;
      case 'next_steps':   await sql`UPDATE meetings SET next_steps=${value}, updated_at=NOW() WHERE id=${id}`; break;
    }
  }

  const rows = await sql`SELECT * FROM meetings WHERE id = ${id}`;
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req, { params }) {
  const id = Number(params.id);
  await sql`DELETE FROM meetings WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
