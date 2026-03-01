import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await sql`SELECT bidder_no, status FROM bidder_insight_status`;
  const result = {};
  for (const row of rows) {
    result[String(row.bidder_no)] = row.status;
  }
  return NextResponse.json(result);
}

export async function POST(req) {
  const { bidderNo, status } = await req.json();

  if (status === null) {
    await sql`DELETE FROM bidder_insight_status WHERE bidder_no = ${bidderNo}`;
  } else {
    await sql`
      INSERT INTO bidder_insight_status (bidder_no, status, updated_at)
      VALUES (${bidderNo}, ${status}, NOW())
      ON CONFLICT (bidder_no) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
    `;
  }

  const rows = await sql`SELECT bidder_no, status FROM bidder_insight_status`;
  const result = {};
  for (const row of rows) {
    result[String(row.bidder_no)] = row.status;
  }
  return NextResponse.json(result);
}
