// Re-seed counterparties + meetings from data/new_data/.
// Idempotent: existing counterparties are updated in place (overwrite policy
// when the new file has a non-null value for a field), and meetings are only
// inserted when no row with the same (counterparty, date, notes) already exists.
//
// Run: node scripts/reseed-counterparties.js [--dry-run]

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const XLSX = require('xlsx');
const path = require('path');

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL in .env.local');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const DRY = process.argv.includes('--dry-run');

const BIDDER_FILE = path.join(process.cwd(), 'data', 'new_data', 'Master Bidder Engagement List - as of 20260424.xlsx');
const OFFTAKER_FILE = path.join(process.cwd(), 'data', 'new_data', 'Offtaker Engagement List_.xlsx');

// New bidder column layout (16 cols — adds "Commentary - CS Cap" at index 7):
// 0 No, 1 Name, 2 Parent/Owner, 3 Geography, 4 Tier, 5 Type, 6 Commentary,
// 7 Commentary - CS Cap, 8 Client Feedback, 9 Adviser Appointed, 10 Details,
// 11 Initial Outreach Email, 12 Acknowledged Receipt, 13 Interested?,
// 14 Initial Call, 15 Call Date
const BIDDER_HEADER_ROW = 11;
const BIDDER_DATA_START = 12;

// Offtaker column layout (unchanged from old format):
// 0 No, 1 Name, 2 Archetype, 3 Contact, 4 Conversation Held, 5 Date of Feedback,
// 6 Conversation Type, 7 Commentary (other project interest),
// 8 Commentary (key notes/constraints)
const OFFTAKER_HEADER_ROW = 10;
const OFFTAKER_DATA_START = 11;

const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

const GEO_FIX = {
  'UK': 'United Kingdom',
  'US': 'United States',
  'USA': 'United States',
  'Neatherlands': 'Netherlands',
};

function clean(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return v;
}

function nonEmpty(s) {
  return s != null && String(s).trim() !== '';
}

function normName(s) {
  return clean(s).toLowerCase();
}

function normalizeGeo(raw) {
  const s = clean(raw);
  return GEO_FIX[s] || s;
}

function extractStates(text) {
  if (!text) return [];
  const upper = String(text).toUpperCase();
  return AU_STATES.filter((s) => new RegExp(`\\b${s}\\b`).test(upper));
}

function toIsoDate(v) {
  if (!v && v !== 0) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    const d = new Date(Math.floor(v - 25569) * 86400 * 1000);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  if (typeof v === 'string') {
    const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  }
  return null;
}

function joinNotes(parts) {
  return parts
    .filter(([, val]) => nonEmpty(val))
    .map(([label, val]) => (label ? `${label}: ${String(val).trim()}` : String(val).trim()))
    .join('\n');
}

function readSheet(filePath, dataStartRow) {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  return raw.slice(dataStartRow);
}

function parseBidders() {
  const rows = readSheet(BIDDER_FILE, BIDDER_DATA_START);
  const out = [];
  for (const row of rows) {
    if (!row[0] && row[0] !== 0) continue;
    const name = clean(row[1]);
    if (!name) continue;
    out.push({
      no: row[0],
      name,
      parentOwner: clean(row[2]) || null,
      geography: normalizeGeo(row[3]) || null,
      tier: row[4] !== '' && row[4] != null ? Number(row[4]) || null : null,
      type: clean(row[5]) || null,
      commentary: clean(row[6]) || null,
      csCapCommentary: clean(row[7]) || null,
      clientFeedback: clean(row[8]) || null,
      adviserAppointed: clean(row[9]) || null,
      details: clean(row[10]) || null,
      initialOutreachEmail: clean(row[11]) || null,
      acknowledgedReceipt: clean(row[12]) || null,
      interested: clean(row[13]) || null,
      initialCall: clean(row[14]) || null,
      callDate: row[15],
    });
  }
  return out;
}

function parseOfftakers() {
  const rows = readSheet(OFFTAKER_FILE, OFFTAKER_DATA_START);
  const out = [];
  for (const row of rows) {
    if (!row[0] && row[0] !== 0) continue;
    const name = clean(row[1]);
    if (!name) continue;
    out.push({
      no: row[0],
      name,
      archetype: clean(row[2]) || null,
      contact: clean(row[3]) || null,
      conversationHeld: clean(row[4]) || null,
      feedbackDate: row[5],
      conversationType: clean(row[6]) || null,
      projectInterest: clean(row[7]) || null,
      keyNotes: clean(row[8]) || null,
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────

async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS counterparties (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      parent_owner TEXT,
      is_bidder BOOLEAN NOT NULL DEFAULT FALSE,
      is_offtaker BOOLEAN NOT NULL DEFAULT FALSE,
      geography TEXT,
      states TEXT[] DEFAULT '{}',
      tier INTEGER,
      archetype TEXT,
      status TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS meetings (
      id SERIAL PRIMARY KEY,
      counterparty_id INTEGER NOT NULL REFERENCES counterparties(id) ON DELETE CASCADE,
      meeting_date DATE,
      attendees TEXT,
      notes TEXT,
      next_steps TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function upsertCounterparty(c) {
  // Overwrite policy: when the new payload has a non-null value, it replaces
  // the existing one; existing values are preserved only where the payload is
  // null. is_bidder / is_offtaker are unioned (never cleared by a re-seed).
  const existing = await sql`
    SELECT id, is_bidder, is_offtaker, name, parent_owner, geography, states,
           tier, archetype, status, notes
    FROM counterparties WHERE LOWER(name) = ${normName(c.name)} LIMIT 1
  `;

  const next = {
    name: c.name, // canonicalize casing from latest source
    parent_owner: c.parent_owner ?? null,
    is_bidder: !!c.is_bidder || (existing[0]?.is_bidder ?? false),
    is_offtaker: !!c.is_offtaker || (existing[0]?.is_offtaker ?? false),
    geography: c.geography ?? null,
    states: c.states && c.states.length ? c.states : null,
    tier: c.tier ?? null,
    archetype: c.archetype ?? null,
    status: c.status ?? null,
    notes: c.notes ?? null,
  };

  if (existing.length === 0) {
    if (DRY) {
      console.log(`  [dry] INSERT counterparty: ${c.name}`);
      return -1;
    }
    const rows = await sql`
      INSERT INTO counterparties (
        name, parent_owner, is_bidder, is_offtaker, geography, states,
        tier, archetype, status, notes
      ) VALUES (
        ${next.name}, ${next.parent_owner}, ${next.is_bidder}, ${next.is_offtaker},
        ${next.geography}, ${next.states || []}, ${next.tier}, ${next.archetype},
        ${next.status}, ${next.notes}
      ) RETURNING id
    `;
    return rows[0].id;
  }

  const cur = existing[0];
  // For each field, prefer the new value when non-null; else keep existing.
  const merged = {
    name: next.name || cur.name,
    parent_owner: next.parent_owner ?? cur.parent_owner,
    is_bidder: next.is_bidder,
    is_offtaker: next.is_offtaker,
    geography: next.geography ?? cur.geography,
    states: next.states ?? (cur.states || []),
    tier: next.tier ?? cur.tier,
    archetype: next.archetype ?? cur.archetype,
    status: next.status ?? cur.status,
    notes: next.notes ?? cur.notes,
  };

  if (DRY) {
    console.log(`  [dry] UPDATE counterparty: ${c.name} (id=${cur.id})`);
    return cur.id;
  }

  await sql`
    UPDATE counterparties SET
      name = ${merged.name},
      parent_owner = ${merged.parent_owner},
      is_bidder = ${merged.is_bidder},
      is_offtaker = ${merged.is_offtaker},
      geography = ${merged.geography},
      states = ${merged.states || []},
      tier = ${merged.tier},
      archetype = ${merged.archetype},
      status = ${merged.status},
      notes = ${merged.notes},
      updated_at = NOW()
    WHERE id = ${cur.id}
  `;
  return cur.id;
}

async function insertMeetingIfNew(cpId, m) {
  if (!cpId || cpId < 0) return false;
  const date = m.meeting_date || null;
  const notes = m.notes || null;

  const dup = await sql`
    SELECT id FROM meetings
    WHERE counterparty_id = ${cpId}
      AND meeting_date IS NOT DISTINCT FROM ${date}::date
      AND notes IS NOT DISTINCT FROM ${notes}
    LIMIT 1
  `;
  if (dup.length > 0) return false;

  if (DRY) {
    console.log(`    [dry] meeting (${date || 'no date'}): ${(notes || '').slice(0, 60)}`);
    return true;
  }
  await sql`
    INSERT INTO meetings (counterparty_id, meeting_date, attendees, notes, next_steps)
    VALUES (${cpId}, ${date}, ${m.attendees || null}, ${notes}, ${m.next_steps || null})
  `;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n${DRY ? '[DRY RUN] ' : ''}Re-seeding counterparties from data/new_data/...\n`);
  await ensureSchema();

  const bidders = parseBidders();
  const offtakers = parseOfftakers();
  console.log(`Read ${bidders.length} bidders, ${offtakers.length} offtakers.\n`);

  let cpUpserts = 0;
  let meetingsInserted = 0;
  let meetingsSkipped = 0;

  for (const b of bidders) {
    const stateText = [b.commentary, b.csCapCommentary, b.details, b.clientFeedback].filter(Boolean).join(' ');
    const states = extractStates(stateText);

    // Combine the two commentary columns into notes (CS Cap labelled separately)
    const notes = [
      b.commentary && b.commentary,
      b.csCapCommentary && `CS Cap: ${b.csCapCommentary}`,
    ].filter(Boolean).join('\n') || null;

    const cpId = await upsertCounterparty({
      name: b.name,
      parent_owner: b.parentOwner,
      is_bidder: true,
      is_offtaker: false,
      geography: b.geography,
      states,
      tier: typeof b.tier === 'number' ? b.tier : null,
      archetype: b.type,
      notes,
    });
    cpUpserts++;

    const callDate = toIsoDate(b.callDate);
    const meetingNotes = joinNotes([
      ['Client feedback', b.clientFeedback],
      ['Adviser appointed', b.adviserAppointed],
      ['Details', b.details],
      ['Initial outreach email', b.initialOutreachEmail],
      ['Acknowledged receipt', b.acknowledgedReceipt],
      ['Interested', b.interested],
      ['Initial call', b.initialCall],
    ]);

    if (callDate || meetingNotes) {
      const inserted = await insertMeetingIfNew(cpId, { meeting_date: callDate, notes: meetingNotes || null });
      inserted ? meetingsInserted++ : meetingsSkipped++;
    }
  }

  for (const o of offtakers) {
    const stateText = [o.projectInterest, o.keyNotes].filter(Boolean).join(' ');
    const states = extractStates(stateText);

    const cpId = await upsertCounterparty({
      name: o.name,
      is_bidder: false,
      is_offtaker: true,
      states,
      archetype: o.archetype,
      notes: o.projectInterest ? `Project interest: ${o.projectInterest}` : null,
    });
    cpUpserts++;

    const meetingDate = toIsoDate(o.feedbackDate);
    const meetingNotes = joinNotes([
      ['Conversation held', o.conversationHeld],
      ['Type', o.conversationType],
      ['Key notes', o.keyNotes],
    ]);

    if (meetingDate || meetingNotes) {
      const inserted = await insertMeetingIfNew(cpId, {
        meeting_date: meetingDate,
        attendees: o.contact || null,
        notes: meetingNotes || null,
      });
      inserted ? meetingsInserted++ : meetingsSkipped++;
    }
  }

  console.log(`\nDone. counterparty upserts: ${cpUpserts}, meetings inserted: ${meetingsInserted}, meetings skipped (duplicates): ${meetingsSkipped}.`);

  if (!DRY) {
    const [{ count: cpCount }] = await sql`SELECT COUNT(*)::int AS count FROM counterparties`;
    const [{ count: mCount }] = await sql`SELECT COUNT(*)::int AS count FROM meetings`;
    const [{ count: bothCount }] = await sql`SELECT COUNT(*)::int AS count FROM counterparties WHERE is_bidder AND is_offtaker`;
    console.log(`Totals — counterparties: ${cpCount} (both bidder+offtaker: ${bothCount}), meetings: ${mCount}`);
  }
}

run().catch((err) => { console.error(err); process.exit(1); });
