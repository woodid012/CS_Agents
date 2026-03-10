const MONTH_NUM = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const mToQ = (m) => Math.ceil(m / 3);

// Returns a numeric sort key (YYYY.Q) so vintages sort chronologically
export function vintageSortKey(v) {
  if (!v) return 0;
  const MONTH_Q = { jan:1,feb:1,mar:1,apr:2,may:2,jun:2,jul:3,aug:3,sep:3,oct:4,nov:4,dec:4,
    january:1,february:1,march:1,april:2,june:2,july:3,august:3,september:3,october:4,november:4,december:4 };

  let m;
  // YYYY-MM
  m = v.match(/^(\d{4})-(\d{2})$/);
  if (m) return parseInt(m[1]) + Math.ceil(parseInt(m[2]) / 3) * 0.1;
  // YYYY-Q#
  m = v.match(/^(\d{4})-Q(\d)$/i);
  if (m) return parseInt(m[1]) + parseInt(m[2]) * 0.1;
  // Q#_YY
  m = v.match(/^Q(\d)_(\d{2})$/i);
  if (m) return (2000 + parseInt(m[2])) + parseInt(m[1]) * 0.1;
  // MonthYY or MonthYYYY
  m = v.match(/^([A-Za-z]+)(\d{2,4})$/);
  if (m) {
    const q = MONTH_Q[m[1].toLowerCase()] || 1;
    const yr = m[2].length === 2 ? 2000 + parseInt(m[2]) : parseInt(m[2]);
    return yr + q * 0.1;
  }
  // Month_YY or Month_YYYY
  m = v.match(/^([A-Za-z]+)_(\d{2,4})$/);
  if (m) {
    const q = MONTH_Q[m[1].toLowerCase()] || 1;
    const yr = m[2].length === 2 ? 2000 + parseInt(m[2]) : parseInt(m[2]);
    return yr + q * 0.1;
  }
  return 0;
}

export function vintageLabel(v) {
  if (!v) return v;

  // YYYY-MM  e.g. "2024-08"
  let m = v.match(/^(\d{4})-(\d{2})$/);
  if (m) return `${m[1]} Q${mToQ(parseInt(m[2]))}`;

  // YYYY-Q#  e.g. "2026-Q1"
  m = v.match(/^(\d{4})-Q(\d)$/i);
  if (m) return `${m[1]} Q${m[2]}`;

  // Q#_YY   e.g. "Q1_26"
  m = v.match(/^Q(\d)_(\d{2})$/i);
  if (m) return `20${m[2]} Q${m[1]}`;

  // MonthYY or MonthYYYY  e.g. "Feb24", "Jan2025", "Nov2024"
  m = v.match(/^([A-Za-z]+)(\d{2,4})$/);
  if (m) {
    const month = MONTH_NUM[m[1].toLowerCase()];
    const year = m[2].length === 2 ? 2000 + parseInt(m[2]) : parseInt(m[2]);
    if (month) return `${year} Q${mToQ(month)}`;
  }

  // Month_YY or Month_YYYY  e.g. "August_24"
  m = v.match(/^([A-Za-z]+)_(\d{2,4})$/);
  if (m) {
    const month = MONTH_NUM[m[1].toLowerCase()];
    const year = m[2].length === 2 ? 2000 + parseInt(m[2]) : parseInt(m[2]);
    if (month) return `${year} Q${mToQ(month)}`;
  }

  return v;
}
