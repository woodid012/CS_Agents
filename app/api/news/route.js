import { NextResponse } from 'next/server';
import newsData from '../../../data/news.json';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const geography = searchParams.get('geography');
  const search = searchParams.get('search');

  let items = [...newsData];

  if (category && category !== 'All') {
    items = items.filter((item) => item.category === category);
  }

  if (geography && geography !== 'All') {
    items = items.filter((item) => item.geography === geography);
  }

  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (item) =>
        item.headline.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q)) ||
        item.relatedBidders.some((b) => b.toLowerCase().includes(q))
    );
  }

  // Sort by date descending
  items.sort((a, b) => new Date(b.date) - new Date(a.date));

  return NextResponse.json({ items, total: items.length });
}
