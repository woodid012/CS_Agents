import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS counterparty_news (
      id SERIAL PRIMARY KEY,
      counterparty_id INTEGER REFERENCES counterparties(id) ON DELETE CASCADE,
      headline TEXT NOT NULL,
      summary TEXT,
      url TEXT,
      source TEXT,
      published_at DATE,
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS counterparty_news_cp_idx ON counterparty_news (counterparty_id, published_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS counterparty_news_published_idx ON counterparty_news (published_at DESC)`;
}

export async function GET(req) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(req.url);
    const since = searchParams.get('since');           // ISO date YYYY-MM-DD
    const cpId  = searchParams.get('counterparty_id'); // optional filter

    let rows;
    if (cpId && since) {
      rows = await sql`
        SELECT n.*, c.name AS counterparty_name
        FROM counterparty_news n
        LEFT JOIN counterparties c ON c.id = n.counterparty_id
        WHERE n.counterparty_id = ${Number(cpId)}
          AND (n.published_at IS NULL OR n.published_at >= ${since}::date)
        ORDER BY n.published_at DESC NULLS LAST, n.created_at DESC
      `;
    } else if (cpId) {
      rows = await sql`
        SELECT n.*, c.name AS counterparty_name
        FROM counterparty_news n
        LEFT JOIN counterparties c ON c.id = n.counterparty_id
        WHERE n.counterparty_id = ${Number(cpId)}
        ORDER BY n.published_at DESC NULLS LAST, n.created_at DESC
      `;
    } else if (since) {
      rows = await sql`
        SELECT n.*, c.name AS counterparty_name
        FROM counterparty_news n
        LEFT JOIN counterparties c ON c.id = n.counterparty_id
        WHERE n.published_at IS NULL OR n.published_at >= ${since}::date
        ORDER BY n.published_at DESC NULLS LAST, n.created_at DESC
      `;
    } else {
      rows = await sql`
        SELECT n.*, c.name AS counterparty_name
        FROM counterparty_news n
        LEFT JOIN counterparties c ON c.id = n.counterparty_id
        ORDER BY n.published_at DESC NULLS LAST, n.created_at DESC
      `;
    }

    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/counterparty-news failed:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureSchema();
    const { counterparty_id, headline, summary, url, source, published_at, tags } = await req.json();
    if (!headline || !headline.trim()) {
      return NextResponse.json({ error: 'headline is required' }, { status: 400 });
    }
    const rows = await sql`
      INSERT INTO counterparty_news (
        counterparty_id, headline, summary, url, source, published_at, tags
      ) VALUES (
        ${counterparty_id || null}, ${headline.trim()}, ${summary || null},
        ${url || null}, ${source || null}, ${published_at || null}, ${tags || []}
      ) RETURNING *
    `;
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('POST /api/counterparty-news failed:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
