import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS counterparties (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      parent_owner TEXT,
      is_bidder BOOLEAN NOT NULL DEFAULT FALSE,
      is_offtaker BOOLEAN NOT NULL DEFAULT FALSE,
      geography TEXT,
      states TEXT[] DEFAULT '{}',
      tier INTEGER,
      archetype TEXT,
      status TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS meetings (
      id SERIAL PRIMARY KEY,
      counterparty_id INTEGER NOT NULL REFERENCES counterparties(id) ON DELETE CASCADE,
      meeting_date DATE,
      attendees TEXT,
      notes TEXT,
      next_steps TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function GET() {
  try {
    await ensureSchema();
    const rows = await sql`
      SELECT c.*,
        (SELECT COUNT(*)::int FROM meetings m WHERE m.counterparty_id = c.id) AS meeting_count,
        (SELECT MAX(meeting_date) FROM meetings m WHERE m.counterparty_id = c.id) AS last_meeting_date,
        COALESCE(
          (SELECT ARRAY_AGG(p.name ORDER BY p.name)
             FROM counterparty_projects cp
             JOIN projects p ON p.id = cp.project_id
            WHERE cp.counterparty_id = c.id),
          ARRAY[]::TEXT[]
        ) AS project_names,
        COALESCE(
          (SELECT ARRAY_AGG(cp.project_id)
             FROM counterparty_projects cp
            WHERE cp.counterparty_id = c.id),
          ARRAY[]::INTEGER[]
        ) AS project_ids
      FROM counterparties c
      ORDER BY c.name ASC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/counterparties failed:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureSchema();
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
  } catch (err) {
    console.error('POST /api/counterparties failed:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
