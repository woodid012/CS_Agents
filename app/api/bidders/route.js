import { NextResponse } from 'next/server';
import { parseExcel } from '../../../lib/parseExcel';
import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [bidders, aiRows, contactRows] = await Promise.all([
    Promise.resolve(parseExcel()),
    sql`SELECT * FROM bidder_ai_data`,
    sql`SELECT * FROM contacts`,
  ]);

  const aiMap = {};
  for (const row of aiRows) aiMap[row.bidder_no] = row;

  const contactMap = {};
  for (const row of contactRows) contactMap[row.bidder_no] = row;

  const result = bidders.map((b) => {
    const ai = aiMap[b.no] || {};
    const c = contactMap[b.no] || {};
    return {
      ...b,
      csInsights: b.commentary,
      aiInsights: ai.ai_insights || '',
      mergedInsights: ai.merged_insights || '',
      aiScore: ai.ai_score || 0,
      aiLabel: ai.ai_label || '-',
      aiScoreReason: ai.ai_score_reason || '',
      contact: c.contact || '',
      email: c.email || '',
      phone: c.phone || '',
    };
  });

  return NextResponse.json(result);
}
