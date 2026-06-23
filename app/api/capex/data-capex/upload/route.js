import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

// Attempt to auto-detect column intent from header name
const AUTO_MAP_RULES = [
  { field: 'reference', patterns: ['reference', 'ref', 'source ref', 'source', 'doc', 'document'] },
  { field: 'name',      patterns: ['name', 'item', 'description', 'desc', 'cost item', 'line item', 'label'] },
  { field: 'type',      patterns: ['type', 'category', 'cat', 'cost type', 'cost category', 'kind'] },
  { field: 'value',     patterns: ['value', 'amount', 'cost', 'total', 'figure', 'number', 'qty', 'quantity'] },
  { field: 'unit',      patterns: ['unit', 'units', 'uom', 'measure', 'metric'] },
];

function autoDetect(header) {
  const h = String(header).toLowerCase().trim();
  for (const { field, patterns } of AUTO_MAP_RULES) {
    if (patterns.some((p) => h === p || h.includes(p))) return field;
  }
  return '';
}

export async function POST(req) {
  let formData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  // Parse all sheets or just the first
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rawRows.length < 2) {
    return NextResponse.json({ error: 'Sheet appears empty or has no data rows' }, { status: 422 });
  }

  const headers = (rawRows[0] || []).map(String);
  const dataRows = rawRows.slice(1).filter((r) => r.some((c) => c !== ''));

  // Auto-detect column mapping
  const autoMap = {};
  headers.forEach((h) => {
    autoMap[h] = autoDetect(h);
  });

  // Return first 5 rows as preview
  const preview = dataRows.slice(0, 5).map((r) =>
    Object.fromEntries(headers.map((h, i) => [h, r[i]]))
  );

  // Return all rows as raw (array of arrays) for the client to map on confirm
  const allRows = dataRows.map((r) =>
    Object.fromEntries(headers.map((h, i) => [h, r[i]]))
  );

  return NextResponse.json({
    filename: file.name,
    sheetName,
    headers,
    autoMap,
    preview,
    allRows,
    totalRows: dataRows.length,
  });
}
