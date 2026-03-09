import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { bidderName, updateType, rawNotes } = await req.json();

  if (!rawNotes?.trim()) {
    return NextResponse.json({ error: 'rawNotes is required' }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    const placeholder =
      `[API key not configured] Draft insight for ${bidderName || 'this bidder'}: ` +
      `${updateType ? `[${updateType}] ` : ''}Review raw notes and add ANTHROPIC_API_KEY to generate AI drafts.`;
    return NextResponse.json({ draft: placeholder });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userPrompt = [
    updateType ? `Update type: ${updateType}` : '',
    bidderName ? `Bidder: ${bidderName}` : '',
    '',
    'Raw notes:',
    rawNotes.trim(),
  ]
    .filter((l) => l !== null)
    .join('\n');

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system:
      'You are an analyst at CS Capital, an Australian renewable energy investment bank. Write a concise 1-3 sentence CS Insight note in professional investment banking style. Focus on the key strategic implication for CS Capital. Be specific, data-driven, and actionable. No fluff.',
    messages: [{ role: 'user', content: userPrompt }],
  });

  const draft = message.content[0]?.text?.trim() || '';
  return NextResponse.json({ draft });
}
