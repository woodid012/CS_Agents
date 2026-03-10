const MONTH_NUM = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const mToQ = (m) => Math.ceil(m / 3);

export function vintageLabel(v) {
  if (!v) return v;

  // YYYY-MM  e.g. "2024-08"
  let m = v.match(/^(\d{4})-(\d{2})$/);
  if (m) return `Q${mToQ(parseInt(m[2]))} ${m[1]}`;

  // YYYY-Q#  e.g. "2026-Q1"
  m = v.match(/^(\d{4})-Q(\d)$/i);
  if (m) return `Q${m[2]} ${m[1]}`;

  // Q#_YY   e.g. "Q1_26"
  m = v.match(/^Q(\d)_(\d{2})$/i);
  if (m) return `Q${m[1]} 20${m[2]}`;

  // MonthYY or MonthYYYY  e.g. "Feb24", "Jan2025", "Nov2024"
  m = v.match(/^([A-Za-z]+)(\d{2,4})$/);
  if (m) {
    const month = MONTH_NUM[m[1].toLowerCase()];
    const year = m[2].length === 2 ? 2000 + parseInt(m[2]) : parseInt(m[2]);
    if (month) return `Q${mToQ(month)} ${year}`;
  }

  // Month_YY or Month_YYYY  e.g. "August_24"
  m = v.match(/^([A-Za-z]+)_(\d{2,4})$/);
  if (m) {
    const month = MONTH_NUM[m[1].toLowerCase()];
    const year = m[2].length === 2 ? 2000 + parseInt(m[2]) : parseInt(m[2]);
    if (month) return `Q${mToQ(month)} ${year}`;
  }

  return v;
}
