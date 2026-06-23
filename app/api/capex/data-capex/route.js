import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const file = searchParams.get('file');

  let rows;
  if (type && file) {
    rows = await sql`SELECT * FROM data_capex WHERE type = ${type} AND file_name = ${file} ORDER BY id`;
  } else if (type) {
    rows = await sql`SELECT * FROM data_capex WHERE type = ${type} ORDER BY id`;
  } else if (file) {
    rows = await sql`SELECT * FROM data_capex WHERE file_name = ${file} ORDER BY id`;
  } else {
    rows = await sql`SELECT * FROM data_capex ORDER BY id`;
  }

  return NextResponse.json(rows);
}

export async function POST(req) {
  const body = await req.json();

  // Bulk insert: { rows: [...] }
  if (Array.isArray(body.rows)) {
    const inserted = [];
    for (const r of body.rows) {
      const [row] = await sql`
        INSERT INTO data_capex (file_name, reference, name, type, value, unit)
        VALUES (
          ${r.file_name ?? null},
          ${r.reference ?? null},
          ${r.name ?? null},
          ${r.type ?? null},
          ${r.value != null ? Number(r.value) : null},
          ${r.unit ?? null}
        )
        RETURNING *
      `;
      inserted.push(row);
    }
    return NextResponse.json({ inserted: inserted.length }, { status: 201 });
  }

  // Single insert
  const { file_name, reference, name, type, value, unit } = body;
  const [row] = await sql`
    INSERT INTO data_capex (file_name, reference, name, type, value, unit)
    VALUES (
      ${file_name ?? null},
      ${reference ?? null},
      ${name ?? null},
      ${type ?? null},
      ${value != null ? Number(value) : null},
      ${unit ?? null}
    )
    RETURNING *
  `;
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req) {
  const { id } = await req.json();
  await sql`DELETE FROM data_capex WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
