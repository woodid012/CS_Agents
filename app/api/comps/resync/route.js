import { NextResponse } from 'next/server';
import { ensureCompsSchema, resyncDealsFull } from '../../../../lib/compsDb';

export const dynamic = 'force-dynamic';

// Force-refresh every dataset deal from data/comps-scrape.json (delete same-name
// + re-insert), so the online page reflects the committed dataset including
// changed values. Powers the "Resync from dataset" button on /comps.
export async function POST() {
  try {
    await ensureCompsSchema();
    const synced = await resyncDealsFull();
    return NextResponse.json({ ok: true, synced });
  } catch (err) {
    console.error('POST /api/comps/resync failed:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
