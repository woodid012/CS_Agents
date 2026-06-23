// Promote gatekeeper-approved candidates into the live dataset.
//
//   node scripts/merge-candidates.js          # merge approved + rebuild standalone
//   node scripts/merge-candidates.js --dry    # report only, write nothing
//
// Reads data/comps-candidates.json. Candidates with review === "approved" are
// moved into data/comps-scrape.json (review metadata stripped). Processed
// candidates (approved + rejected) are appended to
// data/comps-candidates-archive.json; "pending" candidates stay in the inbox.
// On success, regenerates public/comps.html. This is the gatekeeper tier's
// commit step — the cheap scraper never runs it.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry');
const CAND = path.join(ROOT, 'data', 'comps-candidates.json');
const SCRAPE = path.join(ROOT, 'data', 'comps-scrape.json');
const ARCHIVE = path.join(ROOT, 'data', 'comps-candidates-archive.json');

const STRIP = new Set(['review', 'review_note', 'reviewer', 'reviewed_at']);
function clean(c) {
  const out = {};
  for (const [k, v] of Object.entries(c)) if (!STRIP.has(k) && !k.startsWith('_')) out[k] = v;
  return out;
}

function main() {
  const cand = JSON.parse(fs.readFileSync(CAND, 'utf8'));
  const scrape = JSON.parse(fs.readFileSync(SCRAPE, 'utf8'));
  const existing = new Set(scrape.deals.map((d) => d.name.toLowerCase().trim()));

  const list = cand.candidates || [];
  const approved = list.filter((c) => c.review === 'approved');
  const rejected = list.filter((c) => c.review === 'rejected');
  const pending = list.filter((c) => c.review !== 'approved' && c.review !== 'rejected');

  const promoted = [];
  const skipped = [];
  for (const c of approved) {
    const nm = (c.name || '').toLowerCase().trim();
    if (!nm) { skipped.push('(unnamed candidate)'); continue; }
    if (existing.has(nm)) { skipped.push(`${c.name} (already in dataset)`); continue; }
    existing.add(nm);
    promoted.push(clean(c));
  }

  console.log(`Approved: ${approved.length} | Rejected: ${rejected.length} | Pending: ${pending.length}`);
  console.log(`Promoting ${promoted.length} deal(s)${skipped.length ? `, skipping ${skipped.length} (${skipped.join('; ')})` : ''}.`);

  if (DRY) { console.log('\n--dry: no files written.'); return; }
  if (promoted.length === 0 && rejected.length === 0) { console.log('Nothing to do.'); return; }

  // Promote into the live dataset.
  scrape.deals.push(...promoted);
  fs.writeFileSync(SCRAPE, JSON.stringify(scrape, null, 2) + '\n');

  // Archive processed candidates with a timestamp.
  let archive = { processed: [] };
  if (fs.existsSync(ARCHIVE)) { try { archive = JSON.parse(fs.readFileSync(ARCHIVE, 'utf8')); } catch { /* reset */ } }
  const stamp = new Date().toISOString();
  for (const c of [...approved, ...rejected]) archive.processed.push({ archived_at: stamp, ...c });
  fs.writeFileSync(ARCHIVE, JSON.stringify(archive, null, 2) + '\n');

  // Keep only pending candidates in the inbox.
  cand.candidates = pending;
  fs.writeFileSync(CAND, JSON.stringify(cand, null, 2) + '\n');

  // Rebuild the self-contained page.
  console.log('\nRebuilding standalone page…');
  execSync('node scripts/build-standalone.js', { cwd: ROOT, stdio: 'inherit' });
  console.log(`\nDone. Dataset now has ${scrape.deals.length} deals.`);
}

main();
