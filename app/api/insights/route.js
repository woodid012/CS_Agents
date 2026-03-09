import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  await sql`
    CREATE TABLE IF NOT EXISTS analyst_insights (
      id SERIAL PRIMARY KEY,
      bidder_no INTEGER,
      bidder_name TEXT,
      update_type TEXT,
      raw_notes TEXT,
      cs_insight TEXT,
      analyst_name TEXT,
      info_date DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  const rows = await sql`
    SELECT * FROM analyst_insights
    ORDER BY created_at DESC
    LIMIT 100
  `;

  return NextResponse.json(rows);
}

export async function POST(req) {
  const { bidderNo, bidderName, updateType, rawNotes, csInsight, analystName, infoDate } =
    await req.json();

  await sql`
    CREATE TABLE IF NOT EXISTS analyst_insights (
      id SERIAL PRIMARY KEY,
      bidder_no INTEGER,
      bidder_name TEXT,
      update_type TEXT,
      raw_notes TEXT,
      cs_insight TEXT,
      analyst_name TEXT,
      info_date DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  const [row] = await sql`
    INSERT INTO analyst_insights (bidder_no, bidder_name, update_type, raw_notes, cs_insight, analyst_name, info_date)
    VALUES (${bidderNo || null}, ${bidderName || ''}, ${updateType || ''}, ${rawNotes || ''}, ${csInsight || ''}, ${analystName || ''}, ${infoDate || null})
    RETURNING *
  `;

  return NextResponse.json(row, { status: 201 });
}
