const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const HEADER_ROW = 10; // 0-indexed row where headers are
const DATA_START = 11; // 0-indexed row where data begins

const COL_MAP = {
  0: 'no',
  1: 'name',
  2: 'archetype',
  3: 'contact',
  4: 'conversationHeld',
  5: 'feedbackDate',
  6: 'conversationType',
  7: 'projectInterest',
  8: 'keyNotes',
};

function excelDateToString(serial) {
  if (!serial) return '';
  if (typeof serial === 'string') return serial;
  if (typeof serial !== 'number') return String(serial);
  // Excel date serial number to JS date
  const utcDays = Math.floor(serial - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const mon = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${mon}/${year}`;
}

function parseOfftakerExcel() {
  const filePath = path.join(process.cwd(), 'Offtaker Engagement List .xlsx');
  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' });

  const offtakers = [];
  for (let i = DATA_START; i < raw.length; i++) {
    const row = raw[i];
    // Skip empty rows (no number in first column)
    if (!row[0] && row[0] !== 0) continue;

    const offtaker = {};
    for (const [colIdx, field] of Object.entries(COL_MAP)) {
      let val = row[parseInt(colIdx)] ?? '';
      if (typeof val === 'string') val = val.trim();
      if (field === 'feedbackDate') val = excelDateToString(val);
      if (field === 'no' && val !== '') val = Number(val) || val;
      offtaker[field] = val;
    }
    offtakers.push(offtaker);
  }

  return offtakers;
}

module.exports = { parseOfftakerExcel };
