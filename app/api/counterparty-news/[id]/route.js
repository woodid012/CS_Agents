import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

const FIELDS = ['counterparty_id', 'headline', 'summary', 'url', 'source', 'published_at', 'tags'];

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
      case 'counterparty_id': await sql`UPDATE counterparty_news SET counterparty_id=${value || null}, updated_at=NOW() WHERE id=${id}`; break;
      case 'headline':        await sql`UPDATE counterparty_news SET headline=${value}, updated_at=NOW() WHERE id=${id}`; break;
      case 'summary':         await sql`UPDATE counterparty_news SET summary=${value}, updated_at=NOW() WHERE id=${id}`; break;
      case 'url':             await sql`UPDATE counterparty_news SET url=${value}, updated_at=NOW() WHERE id=${id}`; break;
      case 'source':          await sql`UPDATE counterparty_news SET source=${value}, updated_at=NOW() WHERE id=${id}`; break;
      case 'published_at':    await sql`UPDATE counterparty_news SET published_at=${value || null}, updated_at=NOW() WHERE id=${id}`; break;
      case 'tags':            await sql`UPDATE counterparty_news SET tags=${Array.isArray(value) ? value : []}, updated_at=NOW() WHERE id=${id}`; break;
    }
  }

  const rows = await sql`SELECT * FROM counterparty_news WHERE id = ${id}`;
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req, { params }) {
  const id = Number(params.id);
  await sql`DELETE FROM counterparty_news WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
