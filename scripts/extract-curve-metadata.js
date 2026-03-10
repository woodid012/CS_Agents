const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'data', 'price curves', 'curve - files');
const OUT = path.join(__dirname, '..', 'data', 'price curves', 'curve-files-metadata.json');

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.xlsx'));
const meta = [];

files.forEach((f) => {
  const wb = XLSX.readFile(path.join(DIR, f));
  const introSheet = wb.Sheets['Intro'];
  const data = introSheet ? XLSX.utils.sheet_to_json(introSheet, { header: 1, defval: '' }) : [];

  // Extract value following a label anywhere in the sheet
  function getVal(label) {
    for (const row of data) {
      const idx = row.findIndex((c) => String(c).toLowerCase().includes(label.toLowerCase()));
      if (idx >= 0 && row[idx + 1]) return String(row[idx + 1]).trim();
    }
    return '';
  }

  // Title is typically in row index 4
  const titleRow = data[4] || [];
  const titleCell = titleRow.find((c) => c && String(c).includes('Aurora')) || '';
  const title = String(titleCell).replace(/Aurora AUS Power Market Forecast - /i, '').trim();

  // Release date is an Excel serial number
  const releaseSerial = getVal('Release date');
  let releaseDate = '';
  const serial = Number(releaseSerial);
  if (serial > 0) {
    const d = XLSX.SSF.parse_date_code(serial);
    if (d) releaseDate = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }

  // Description from row 6
  const descRow = data[5] || [];
  const desc = descRow.find((c) => c && String(c).length > 20) || '';

  meta.push({
    filename: f,
    title: title || f,
    description: String(desc).replace(/\s+/g, ' ').trim().slice(0, 200),
    version: getVal('Version'),
    release_date: releaseDate,
    prepared_by: getVal('Prepared by'),
    sheets: wb.SheetNames,
    size_bytes: fs.statSync(path.join(DIR, f)).size,
  });
});

meta.sort((a, b) => a.release_date.localeCompare(b.release_date));
fs.writeFileSync(OUT, JSON.stringify(meta, null, 2));
console.log(`Wrote metadata for ${meta.length} files to ${OUT}`);
meta.forEach((m) => console.log(` - ${m.title} (${m.release_date}) ${Math.round(m.size_bytes/1024)}KB`));
