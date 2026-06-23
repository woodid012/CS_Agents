// Deterministic validator for comps data — the mechanical gate both pipeline
// tiers rely on (the cheap scraper self-checks; the smart gatekeeper runs it
// before approving). Validates structure, taxonomy membership, references,
// value sanity and duplicates against the live dataset.
//
//   node scripts/validate-candidates.js                 # validate data/comps-candidates.json
//   node scripts/validate-candidates.js <file.json>     # validate any deals/candidates file
//
// Exit code 0 = no errors (warnings allowed); 1 = errors found.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const file = process.argv[2] || path.join(ROOT, 'data', 'comps-candidates.json');

// ── Parse the taxonomy (single source of truth) ─────────────────────────────
const tax = fs.readFileSync(path.join(ROOT, 'lib', 'compsTaxonomy.js'), 'utf8');
const arr = (name) => {
  const m = tax.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\];`));
  return m ? [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]) : [];
};
const METRIC_KEYS = new Set([...tax.matchAll(/\{\s*key:\s*'([a-z_]+)',\s*label:\s*'[^']+',\s*defaultUnit:/g)].map((m) => m[1]));
const CATEGORY_KEYS = new Set([...tax.matchAll(/\{\s*key:\s*'([a-z_]+)',\s*label:\s*'[^']+',\s*color:/g)].map((m) => m[1]));
const UNITS = new Set(arr('UNITS'));
const BASES = new Set(arr('BASES'));
const TECHNOLOGIES = new Set(arr('TECHNOLOGIES'));
const DEAL_TYPES = new Set(arr('DEAL_TYPES'));
const STATES = new Set(arr('STATES'));
const CONFIDENCE = new Set(arr('CONFIDENCE'));
const SCHEMES = new Set(arr('SCHEMES'));

// Existing deal names (lower-cased) for duplicate detection. Skipped when the
// target IS the live dataset (every name would otherwise match itself).
const SCRAPE_PATH = path.join(ROOT, 'data', 'comps-scrape.json');
const validatingScrape = path.resolve(file) === SCRAPE_PATH;
const scrape = JSON.parse(fs.readFileSync(SCRAPE_PATH, 'utf8'));
const existingNames = validatingScrape ? new Set() : new Set((scrape.deals || []).map((d) => d.name.toLowerCase().trim()));

// Plausibility ranges (AUD) for common normalised cost metrics — warn if outside.
const RANGES = {
  capex_per_mw: [300000, 8000000],
  capex_per_mwh: [100000, 1500000],
  opex_per_mw_yr: [3000, 80000],
  ppa_price: [20, 200],
  connection_per_mw: [10000, 500000],
};

function validateDeal(d, idx, seenNames) {
  const errs = [];
  const warns = [];
  const id = d.name ? `"${d.name}"` : `#${idx}`;

  if (!d.name || !String(d.name).trim()) errs.push('missing name');
  const illustrative = d.confidence === 'Illustrative';
  if (!d.source_url && !illustrative) errs.push('missing source_url (required unless confidence=Illustrative)');
  if (d.source_url && !/^https?:\/\//.test(d.source_url)) errs.push(`source_url not a URL: ${d.source_url}`);
  if (!d.source) warns.push('missing source (publisher name)');
  if (!d.confidence) warns.push('missing confidence');
  else if (!CONFIDENCE.has(d.confidence)) warns.push(`confidence not in taxonomy: ${d.confidence}`);

  if (d.transaction_date && isNaN(Date.parse(d.transaction_date))) errs.push(`unparseable transaction_date: ${d.transaction_date}`);
  if (d.technology && !TECHNOLOGIES.has(d.technology)) warns.push(`technology not in taxonomy: ${d.technology}`);
  if (d.deal_type && !DEAL_TYPES.has(d.deal_type)) warns.push(`deal_type not in taxonomy: ${d.deal_type}`);
  if (d.state && !STATES.has(d.state)) warns.push(`state not in taxonomy: ${d.state}`);
  if (d.scheme && !SCHEMES.has(d.scheme)) warns.push(`scheme not in taxonomy (ok if new): ${d.scheme}`);

  for (const k of ['capacity_mw', 'capacity_mwh', 'capacity_mwac', 'capacity_mwdc']) {
    if (d[k] != null && (typeof d[k] !== 'number' || d[k] <= 0)) errs.push(`${k} must be a positive number`);
  }

  // Duplicate detection
  const nm = (d.name || '').toLowerCase().trim();
  if (nm && existingNames.has(nm)) errs.push('duplicate: a deal with this name already exists in comps-scrape.json');
  if (nm && seenNames.has(nm)) errs.push('duplicate name within candidates');
  if (nm) seenNames.add(nm);

  // Metrics
  if (d.metrics != null && !Array.isArray(d.metrics)) errs.push('metrics must be an array');
  for (const m of d.metrics || []) {
    const ml = m.metric || '(none)';
    if (!m.metric) errs.push('metric row missing "metric" key');
    else if (!METRIC_KEYS.has(m.metric)) errs.push(`unknown metric key: ${m.metric}`);
    if (!m.category) warns.push(`metric ${ml}: missing category`);
    else if (!CATEGORY_KEYS.has(m.category)) errs.push(`metric ${ml}: unknown category ${m.category}`);
    if (m.unit && !UNITS.has(m.unit)) warns.push(`metric ${ml}: unit not in taxonomy: ${m.unit}`);
    if (m.basis && !BASES.has(m.basis)) warns.push(`metric ${ml}: basis not in taxonomy: ${m.basis}`);
    if (m.value != null && (typeof m.value !== 'number' || isNaN(m.value))) errs.push(`metric ${ml}: value must be numeric`);
    if (m.value != null && typeof m.value === 'number' && m.value <= 0 && m.unit && m.unit.startsWith('$')) warns.push(`metric ${ml}: non-positive monetary value`);
    if (!m.source_url && !d.source_url && !illustrative) warns.push(`metric ${ml}: no source_url (and deal has none)`);
    const r = RANGES[m.metric];
    if (r && typeof m.value === 'number' && (m.value < r[0] || m.value > r[1])) warns.push(`metric ${ml}: value ${m.value} outside plausible range [${r[0]}, ${r[1]}]`);
  }

  return { id, errs, warns };
}

function main() {
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.error(`Cannot parse ${file}: ${e.message}`); process.exit(1); }

  const list = Array.isArray(data) ? data : (data.candidates || data.deals || []);
  console.log(`Validating ${list.length} entries in ${path.relative(ROOT, file)}\n`);

  let totalErr = 0, totalWarn = 0;
  const seenNames = new Set();
  list.forEach((d, i) => {
    const { id, errs, warns } = validateDeal(d, i, seenNames);
    if (errs.length || warns.length) {
      console.log(`${id}`);
      errs.forEach((e) => console.log(`  ✖ ERROR: ${e}`));
      warns.forEach((w) => console.log(`  ⚠ warn:  ${w}`));
      console.log('');
    }
    totalErr += errs.length;
    totalWarn += warns.length;
  });

  console.log(`Result: ${totalErr} error(s), ${totalWarn} warning(s) across ${list.length} entries.`);
  process.exit(totalErr > 0 ? 1 : 0);
}

main();
