import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await sql`SELECT offtaker_no, status FROM offtaker_insight_status`;
  const result = {};
  for (const row of rows) {
    result[String(row.offtaker_no)] = row.status;
  }
  return NextResponse.json(result);
}

export async function POST(req) {
  const { bidderNo, status } = await req.json();

  if (status === null) {
    await sql`DELETE FROM offtaker_insight_status WHERE offtaker_no = ${bidderNo}`;
  } else {
    await sql`
      INSERT INTO offtaker_insight_status (offtaker_no, status, updated_at)
      VALUES (${bidderNo}, ${status}, NOW())
      ON CONFLICT (offtaker_no) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
    `;
  }

  const rows = await sql`SELECT offtaker_no, status FROM offtaker_insight_status`;
  const result = {};
  for (const row of rows) {
    result[String(row.offtaker_no)] = row.status;
  }
  return NextResponse.json(result);
}
