import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await sql`
    SELECT c.*,
      (SELECT COUNT(*)::int FROM meetings m WHERE m.counterparty_id = c.id) AS meeting_count,
      (SELECT MAX(meeting_date) FROM meetings m WHERE m.counterparty_id = c.id) AS last_meeting_date
    FROM counterparties c
    ORDER BY c.name ASC
  `;
  return NextResponse.json(rows);
}

export async function POST(req) {
  const body = await req.json();
  const {
    name, parent_owner, is_bidder, is_offtaker,
    geography, states, tier, archetype, status, notes,
  } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO counterparties (
      name, parent_owner, is_bidder, is_offtaker,
      geography, states, tier, archetype, status, notes
    ) VALUES (
      ${name.trim()}, ${parent_owner || null}, ${!!is_bidder}, ${!!is_offtaker},
      ${geography || null}, ${states || []}, ${tier || null}, ${archetype || null},
      ${status || null}, ${notes || null}
    ) RETURNING *
  `;
  return NextResponse.json(rows[0]);
}
