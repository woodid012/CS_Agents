import { NextResponse } from 'next/server';
import { sql } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const counterpartyId = Number(params.id);
  const rows = await sql`
    SELECT * FROM meetings
    WHERE counterparty_id = ${counterpartyId}
    ORDER BY meeting_date DESC NULLS LAST, created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req, { params }) {
  const counterpartyId = Number(params.id);
  const { meeting_date, attendees, notes, next_steps } = await req.json();

  const rows = await sql`
    INSERT INTO meetings (counterparty_id, meeting_date, attendees, notes, next_steps)
    VALUES (${counterpartyId}, ${meeting_date || null}, ${attendees || null},
            ${notes || null}, ${next_steps || null})
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}
