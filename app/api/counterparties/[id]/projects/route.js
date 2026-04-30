import { NextResponse } from 'next/server';
import { sql } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const cpId = Number(params.id);
  const rows = await sql`
    SELECT p.id, p.name, p.status
    FROM projects p
    JOIN counterparty_projects cp ON cp.project_id = p.id
    WHERE cp.counterparty_id = ${cpId}
    ORDER BY p.name ASC
  `;
  return NextResponse.json(rows);
}

// Replace the full set of project assignments for this counterparty
export async function PUT(req, { params }) {
  const cpId = Number(params.id);
  const { project_ids } = await req.json();
  const ids = Array.isArray(project_ids) ? project_ids.map(Number).filter((n) => !Number.isNaN(n)) : [];

  await sql`DELETE FROM counterparty_projects WHERE counterparty_id = ${cpId}`;
  for (const pid of ids) {
    await sql`
      INSERT INTO counterparty_projects (counterparty_id, project_id)
      VALUES (${cpId}, ${pid})
      ON CONFLICT DO NOTHING
    `;
  }

  const rows = await sql`
    SELECT p.id, p.name, p.status
    FROM projects p
    JOIN counterparty_projects cp ON cp.project_id = p.id
    WHERE cp.counterparty_id = ${cpId}
    ORDER BY p.name ASC
  `;
  return NextResponse.json(rows);
}
