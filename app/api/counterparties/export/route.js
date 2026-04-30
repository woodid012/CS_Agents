import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const counterparties = await sql`
      SELECT c.id, c.name, c.parent_owner, c.is_bidder, c.is_offtaker,
             c.geography, c.states, c.tier, c.archetype, c.status, c.notes,
             COALESCE(
               (SELECT ARRAY_AGG(p.name ORDER BY p.name)
                  FROM counterparty_projects cp JOIN projects p ON p.id = cp.project_id
                 WHERE cp.counterparty_id = c.id),
               ARRAY[]::TEXT[]
             ) AS project_names
      FROM counterparties c
      ORDER BY c.name ASC
    `;

    const meetings = await sql`
      SELECT id, counterparty_id, meeting_date, attendees, notes, next_steps
      FROM meetings
      ORDER BY counterparty_id ASC, meeting_date DESC NULLS LAST, created_at DESC
    `;

    const meetingsByCp = new Map();
    for (const m of meetings) {
      if (!meetingsByCp.has(m.counterparty_id)) meetingsByCp.set(m.counterparty_id, []);
      meetingsByCp.get(m.counterparty_id).push(m);
    }

    const result = counterparties.map((c) => ({
      ...c,
      meetings: meetingsByCp.get(c.id) || [],
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('GET /api/counterparties/export failed:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
