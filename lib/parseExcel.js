const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const HEADER_ROW = 11; // 0-indexed row where headers are
const DATA_START = 12; // 0-indexed row where data begins

const COL_MAP = {
  0: 'no',
  1: 'name',
  2: 'parentOwner',
  3: 'geography',
  4: 'tier',
  5: 'type',
  6: 'commentary',
  7: 'clientFeedback',
  8: 'adviserAppointed',
  9: 'details',
  10: 'initialOutreachEmail',
  11: 'acknowledgedReceipt',
  12: 'interested',
  13: 'initialCall',
  14: 'callDate',
};

function normalizeGeo(raw) {
  if (!raw) return '';
  const s = raw.trim();
  const map = {
    'UK': 'United Kingdom',
    'US': 'United States',
    'USA': 'United States',
    'Neatherlands': 'Netherlands',
  };
  return map[s] || s;
}

function parseExcel() {
  const filePath = path.join(process.cwd(), 'Master Bidder Engagement List - CSC.xlsx');
  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' });

  const bidders = [];
  for (let i = DATA_START; i < raw.length; i++) {
    const row = raw[i];
    // Skip empty rows (no number in first column)
    if (!row[0] && row[0] !== 0) continue;

    const bidder = {};
    for (const [colIdx, field] of Object.entries(COL_MAP)) {
      let val = row[parseInt(colIdx)] ?? '';
      if (typeof val === 'string') val = val.trim();
      if (field === 'geography') val = normalizeGeo(val);
      if (field === 'type' && typeof val === 'string') val = val.trim();
      if (field === 'tier' && val !== '') val = Number(val) || val;
      bidder[field] = val;
    }
    bidders.push(bidder);
  }

  return bidders;
}

module.exports = { parseExcel };
