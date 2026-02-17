import { NextResponse } from 'next/server';
import { parseOfftakerExcel } from '../../../lib/parseOfftakerExcel';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function loadJson(filename) {
  const filePath = path.join(process.cwd(), 'data', filename);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

export async function GET() {
  const offtakers = parseOfftakerExcel();
  const insights = loadJson('offtaker-insights.json');

  const result = offtakers.map((o) => ({
    ...o,
    aiInsights: insights[String(o.no)] || '',
  }));

  return NextResponse.json(result);
}
