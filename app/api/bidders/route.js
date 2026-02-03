import { NextResponse } from 'next/server';
import { parseExcel } from '../../../lib/parseExcel';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

let cached = null;

function loadJson(filename) {
  const filePath = path.join(process.cwd(), 'data', filename);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

export async function GET() {
  if (!cached) {
    const bidders = parseExcel();
    const insights = loadJson('ai-insights.json');
    const contacts = loadJson('contacts.json');
    const aiTiers = loadJson('ai-tier-scores.json');
    cached = bidders.map((b) => {
      const c = contacts[String(b.no)] || {};
      const t = aiTiers[String(b.no)] || {};
      return {
        ...b,
        aiInsights: insights[String(b.no)] || '',
        csInsights: b.commentary,
        contact: c.contact || '',
        email: c.email || '',
        phone: c.phone || '',
        aiScore: t.score || 0,
        aiLabel: t.label || '-',
        aiScoreReason: t.reason || '',
      };
    });
  }
  return NextResponse.json(cached);
}
