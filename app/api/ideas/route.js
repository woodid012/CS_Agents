import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

const SEED_IDEAS = [
  {
    title: 'Add Brookfield contact details to CRM',
    category: 'Deal Opportunity',
    description: 'Brookfield completed the Neoen acquisition. We should add key Brookfield infrastructure contacts (Sydney office) to the CRM bidder record for outreach tracking.',
    submitted_by: 'CS Capital Team',
    priority: 'high',
  },
  {
    title: 'Import latest BESS capex benchmarks from GHD report',
    category: 'Market Intelligence',
    description: 'GHD published updated BESS capex benchmarks in Q1 2026. Import into the Capex Benchmarks page to keep comparables current for client presentations.',
    submitted_by: 'CS Capital Team',
    priority: 'medium',
  },
  {
    title: 'Build email digest of weekly news items',
    category: 'CRM Improvement',
    description: 'Auto-generate a weekly email digest from the News & Intelligence feed and send to the deal team every Monday morning. Reduces manual curation effort.',
    submitted_by: 'CS Capital Team',
    priority: 'low',
  },
  {
    title: 'Track Waratah Super Battery transaction timeline',
    category: 'Deal Opportunity',
    description: 'Waratah Super Battery (850 MW / 1,680 MWh) is a key comparable. Add a dedicated transaction timeline tracker to the CRM to monitor milestones, financing close, and commissioning dates.',
    submitted_by: 'CS Capital Team',
    priority: 'high',
  },
];

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS ideas (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT,
      description TEXT,
      submitted_by TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'new',
      upvotes INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

async function maybeSeed() {
  const rows = await sql`SELECT COUNT(*) AS cnt FROM ideas`;
  if (parseInt(rows[0].cnt, 10) === 0) {
    for (const idea of SEED_IDEAS) {
      await sql`
        INSERT INTO ideas (title, category, description, submitted_by, priority, status, upvotes)
        VALUES (${idea.title}, ${idea.category}, ${idea.description}, ${idea.submitted_by}, ${idea.priority}, 'new', 0)
      `;
    }
  }
}

export async function GET() {
  try {
    await ensureTable();
    await maybeSeed();
    const ideas = await sql`SELECT * FROM ideas ORDER BY created_at DESC`;
    return NextResponse.json(ideas);
  } catch (err) {
    console.error('GET /api/ideas error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureTable();
    const body = await req.json();
    const { title, category, description, submitted_by, priority } = body;
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    const rows = await sql`
      INSERT INTO ideas (title, category, description, submitted_by, priority, status, upvotes)
      VALUES (
        ${title.trim()},
        ${category || 'Other'},
        ${description || ''},
        ${submitted_by || 'Anonymous'},
        ${priority || 'medium'},
        'new',
        0
      )
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/ideas error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { id, action, status } = body;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    let rows;
    if (action === 'upvote') {
      rows = await sql`
        UPDATE ideas SET upvotes = upvotes + 1 WHERE id = ${id} RETURNING *
      `;
    } else if (status) {
      rows = await sql`
        UPDATE ideas SET status = ${status} WHERE id = ${id} RETURNING *
      `;
    } else {
      return NextResponse.json({ error: 'action or status required' }, { status: 400 });
    }
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('PATCH /api/ideas error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
