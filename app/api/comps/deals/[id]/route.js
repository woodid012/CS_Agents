import { NextResponse } from 'next/server';
import { sql } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

// Explicit per-column updates — the neon serverless driver does not support
// dynamic identifier interpolation, so we whitelist columns the same way
// /api/projects/[id] does.
const num = (v) => (v === '' || v == null ? null : Number(v));

export async function PATCH(req, { params }) {
  const id = Number(params.id);
  const b = await req.json();

  if ('name' in b)             await sql`UPDATE comp_deals SET name=${b.name === '' ? null : b.name}, updated_at=NOW() WHERE id=${id}`;
  if ('counterparty' in b)     await sql`UPDATE comp_deals SET counterparty=${b.counterparty || null}, updated_at=NOW() WHERE id=${id}`;
  if ('seller' in b)           await sql`UPDATE comp_deals SET seller=${b.seller || null}, updated_at=NOW() WHERE id=${id}`;
  if ('technology' in b)       await sql`UPDATE comp_deals SET technology=${b.technology || null}, updated_at=NOW() WHERE id=${id}`;
  if ('deal_type' in b)        await sql`UPDATE comp_deals SET deal_type=${b.deal_type || null}, updated_at=NOW() WHERE id=${id}`;
  if ('state' in b)            await sql`UPDATE comp_deals SET state=${b.state || null}, updated_at=NOW() WHERE id=${id}`;
  if ('status' in b)           await sql`UPDATE comp_deals SET status=${b.status || null}, updated_at=NOW() WHERE id=${id}`;
  if ('transaction_date' in b) await sql`UPDATE comp_deals SET transaction_date=${b.transaction_date || null}, updated_at=NOW() WHERE id=${id}`;
  if ('currency' in b)         await sql`UPDATE comp_deals SET currency=${b.currency || null}, updated_at=NOW() WHERE id=${id}`;
  if ('scheme' in b)           await sql`UPDATE comp_deals SET scheme=${b.scheme || null}, updated_at=NOW() WHERE id=${id}`;
  if ('program' in b)          await sql`UPDATE comp_deals SET program=${b.program || null}, updated_at=NOW() WHERE id=${id}`;
  if ('source' in b)           await sql`UPDATE comp_deals SET source=${b.source || null}, updated_at=NOW() WHERE id=${id}`;
  if ('source_url' in b)       await sql`UPDATE comp_deals SET source_url=${b.source_url || null}, updated_at=NOW() WHERE id=${id}`;
  if ('confidence' in b)       await sql`UPDATE comp_deals SET confidence=${b.confidence || null}, updated_at=NOW() WHERE id=${id}`;
  if ('notes' in b)            await sql`UPDATE comp_deals SET notes=${b.notes || null}, updated_at=NOW() WHERE id=${id}`;
  if ('capacity_mw' in b)      await sql`UPDATE comp_deals SET capacity_mw=${num(b.capacity_mw)}, updated_at=NOW() WHERE id=${id}`;
  if ('capacity_mwh' in b)     await sql`UPDATE comp_deals SET capacity_mwh=${num(b.capacity_mwh)}, updated_at=NOW() WHERE id=${id}`;
  if ('capacity_mwac' in b)    await sql`UPDATE comp_deals SET capacity_mwac=${num(b.capacity_mwac)}, updated_at=NOW() WHERE id=${id}`;
  if ('capacity_mwdc' in b)    await sql`UPDATE comp_deals SET capacity_mwdc=${num(b.capacity_mwdc)}, updated_at=NOW() WHERE id=${id}`;

  const [row] = await sql`SELECT * FROM comp_deals WHERE id = ${id}`;
  return NextResponse.json(row);
}

export async function DELETE(_req, { params }) {
  const id = Number(params.id);
  await sql`DELETE FROM comp_deals WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
