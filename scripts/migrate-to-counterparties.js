// One-time migration: seeds counterparties + meetings from the two Excel
// engagement lists. Idempotent — safe to re-run; it upserts on lower(name).
//
// Run: node scripts/migrate-to-counterparties.js [--dry-run]

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const { parseExcel } = require('../lib/parseExcel');
const { parseOfftakerExcel } = require('../lib/parseOfftakerExcel');

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL in .env.local');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const DRY = process.argv.includes('--dry-run');

const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

function extractStates(text) {
  if (!text || typeof text !== 'string') return [];
  const upper = text.toUpperCase();
  return AU_STATES.filter((s) => new RegExp(`\\b${s}\\b`).test(upper));
}

function normName(s) {
  return (s || '').trim().toLowerCase();
}

// Excel serial → ISO date or null
function toIsoDate(v) {
  if (!v && v !== 0) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    const d = new Date(Math.floor(v - 25569) * 86400 * 1000);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  // dd/mm/yyyy already-stringified
  if (typeof v === 'string') {
    const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  }
  return null;
}

function nonEmpty(...vals) {
  return vals.some((v) => v != null && String(v).trim() !== '');
}

function joinNotes(parts) {
  return parts
    .filter((p) => p && String(p).trim() !== '')
    .map(([label, val]) => (label ? `${label}: ${val}` : String(val)))
    .filter((s) => s && s.trim() !== '')
    .join('\n');
}

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
  await sql`CREATE INDEX IF NOT EXISTS counterparties_name_idx ON counterparties (LOWER(name))`;
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
  await sql`CREATE INDEX IF NOT EXISTS meetings_counterparty_idx ON meetings (counterparty_id, meeting_date DESC)`;
}

async function upsertCounterparty(c) {
  // Look up existing by case-insensitive name
  const existing = await sql`
    SELECT id, is_bidder, is_offtaker, notes, states, geography, parent_owner, tier, archetype
    FROM counterparties WHERE LOWER(name) = ${normName(c.name)} LIMIT 1
  `;

  if (existing.length === 0) {
    if (DRY) {
      console.log(`  [dry] INSERT counterparty: ${c.name}`);
      return -1;
    }
    const rows = await sql`
      INSERT INTO counterparties (
        name, parent_owner, is_bidder, is_offtaker, geography, states, tier, archetype, status, notes
      ) VALUES (
        ${c.name}, ${c.parent_owner || null}, ${!!c.is_bidder}, ${!!c.is_offtaker},
        ${c.geography || null}, ${c.states || []}, ${c.tier || null}, ${c.archetype || null},
        ${c.status || null}, ${c.notes || null}
      ) RETURNING id
    `;
    return rows[0].id;
  }

  const cur = existing[0];
  const merged = {
    is_bidder: cur.is_bidder || !!c.is_bidder,
    is_offtaker: cur.is_offtaker || !!c.is_offtaker,
    parent_owner: cur.parent_owner || c.parent_owner || null,
    geography: cur.geography || c.geography || null,
    states: Array.from(new Set([...(cur.states || []), ...(c.states || [])])),
    tier: cur.tier || c.tier || null,
    archetype: cur.archetype || c.archetype || null,
    notes: [cur.notes, c.notes].filter(Boolean).join('\n').trim() || null,
  };

  if (DRY) {
    console.log(`  [dry] MERGE counterparty: ${c.name} (id=${cur.id})`);
    return cur.id;
  }

  await sql`
    UPDATE counterparties SET
      is_bidder = ${merged.is_bidder},
      is_offtaker = ${merged.is_offtaker},
      parent_owner = ${merged.parent_owner},
      geography = ${merged.geography},
      states = ${merged.states},
      tier = ${merged.tier},
      archetype = ${merged.archetype},
      notes = ${merged.notes},
      updated_at = NOW()
    WHERE id = ${cur.id}
  `;
  return cur.id;
}

async function insertMeeting(counterpartyId, m) {
  if (DRY) {
    console.log(`    [dry] meeting (${m.meeting_date || 'no date'}): ${(m.notes || '').slice(0, 60)}`);
    return;
  }
  if (counterpartyId < 0) return; // dry-run insert path
  await sql`
    INSERT INTO meetings (counterparty_id, meeting_date, attendees, notes, next_steps)
    VALUES (${counterpartyId}, ${m.meeting_date || null}, ${m.attendees || null},
            ${m.notes || null}, ${m.next_steps || null})
  `;
}

async function migrate() {
  console.log(`\n${DRY ? '[DRY RUN] ' : ''}Migrating to counterparties + meetings...\n`);

  await ensureSchema();

  const bidders = parseExcel();
  const offtakers = parseOfftakerExcel();
  console.log(`Read ${bidders.length} bidders, ${offtakers.length} offtakers.\n`);

  let cpUpserts = 0;
  let meetingsInserted = 0;

  // --- Bidders ---
  for (const b of bidders) {
    if (!b.name) continue;
    const states = extractStates([b.commentary, b.details, b.clientFeedback].filter(Boolean).join(' '));

    const cpId = await upsertCounterparty({
      name: b.name,
      parent_owner: b.parentOwner,
      is_bidder: true,
      is_offtaker: false,
      geography: b.geography,
      states,
      tier: typeof b.tier === 'number' ? b.tier : null,
      archetype: b.type,
      notes: b.commentary || null,
    });
    cpUpserts++;

    // Create a meeting if there's any engagement signal
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
      await insertMeeting(cpId, {
        meeting_date: callDate,
        notes: meetingNotes || null,
      });
      meetingsInserted++;
    }
  }

  // --- Offtakers ---
  for (const o of offtakers) {
    if (!o.name) continue;
    const states = extractStates([o.projectInterest, o.keyNotes].filter(Boolean).join(' '));

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
      await insertMeeting(cpId, {
        meeting_date: meetingDate,
        attendees: o.contact || null,
        notes: meetingNotes || null,
      });
      meetingsInserted++;
    }
  }

  console.log(`\nDone. counterparty upserts: ${cpUpserts}, meetings inserted: ${meetingsInserted}.`);

  if (!DRY) {
    const [{ count: cpCount }] = await sql`SELECT COUNT(*)::int AS count FROM counterparties`;
    const [{ count: mCount }] = await sql`SELECT COUNT(*)::int AS count FROM meetings`;
    const [{ count: bothCount }] = await sql`
      SELECT COUNT(*)::int AS count FROM counterparties WHERE is_bidder AND is_offtaker
    `;
    console.log(`Totals — counterparties: ${cpCount} (both bidder+offtaker: ${bothCount}), meetings: ${mCount}`);
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
