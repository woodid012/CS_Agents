import { NextResponse } from 'next/server';
import { parseOfftakerExcel } from '../../../lib/parseOfftakerExcel';
import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [offtakers, aiRows] = await Promise.all([
    Promise.resolve(parseOfftakerExcel()),
    sql`SELECT offtaker_no, ai_insights FROM offtaker_ai_data`,
  ]);

  const aiMap = {};
  for (const row of aiRows) aiMap[row.offtaker_no] = row;

  const result = offtakers.map((o) => ({
    ...o,
    aiInsights: aiMap[o.no]?.ai_insights || '',
  }));

  return NextResponse.json(result);
}
