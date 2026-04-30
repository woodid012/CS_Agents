import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

const SEED = ['Quagga', 'Lindley', 'Gemini', 'Capricorn', 'Windlab', 'Westwind', 'ACEN'];

async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      status TEXT DEFAULT 'Active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS counterparty_projects (
      counterparty_id INTEGER NOT NULL REFERENCES counterparties(id) ON DELETE CASCADE,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      PRIMARY KEY (counterparty_id, project_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS counterparty_projects_project_idx ON counterparty_projects (project_id)`;

  // Seed the initial deal names — idempotent
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM projects`;
  if (count === 0) {
    for (const name of SEED) {
      await sql`INSERT INTO projects (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
    }
  }
}

export async function GET() {
  try {
    await ensureSchema();
    const rows = await sql`
      SELECT p.*,
        (SELECT COUNT(*)::int FROM counterparty_projects cp WHERE cp.project_id = p.id) AS counterparty_count
      FROM projects p
      ORDER BY p.name ASC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/projects failed:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureSchema();
    const { name, description, status } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const rows = await sql`
      INSERT INTO projects (name, description, status)
      VALUES (${name.trim()}, ${description || null}, ${status || 'Active'})
      RETURNING *
    `;
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('POST /api/projects failed:', err);
    const msg = err.message?.includes('duplicate') ? 'A project with that name already exists' : (err.message || 'Internal error');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
