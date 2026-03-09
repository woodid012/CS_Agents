'use client';

import { useState, useMemo } from 'react';
import newsData from '../../data/news.json';

const CATEGORIES = ['All', 'M&A Deals', 'BESS', 'Policy & Regulation', 'Transmission', 'Offtakers', 'FIRB'];
const GEOGRAPHIES = ['All', 'NSW', 'VIC', 'QLD', 'SA', 'WA'];

const CATEGORY_STYLES = {
  'M&A Deals': 'bg-blue-100 text-blue-800',
  'BESS': 'bg-green-100 text-green-800',
  'Policy & Regulation': 'bg-purple-100 text-purple-800',
  'Transmission': 'bg-orange-100 text-orange-800',
  'Offtakers': 'bg-teal-100 text-teal-800',
  'FIRB': 'bg-red-100 text-red-800',
};

const CATEGORY_BORDER = {
  'M&A Deals': 'border-l-blue-500',
  'BESS': 'border-l-green-500',
  'Policy & Regulation': 'border-l-purple-500',
  'Transmission': 'border-l-orange-500',
  'Offtakers': 'border-l-teal-500',
  'FIRB': 'border-l-red-500',
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysAgo(dateStr) {
  const now = new Date('2026-03-10');
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  if (diff < 30) return `${diff} days ago`;
  if (diff < 365) return `${Math.floor(diff / 30)}mo ago`;
  return `${Math.floor(diff / 365)}y ago`;
}

// ── Market Pulse stats ────────────────────────────────────────────────────────

const MARKET_PULSE = [
  { label: 'CIS Awarded (Storage)', value: '5.78 GW / 21.57 GWh', trend: 'up', note: 'Tender 8 open (16 GWh target)' },
  { label: 'NEM BESS Pipeline', value: '13 GW / 34.7 GWh', trend: 'up', note: '75 projects committed/construction' },
  { label: 'NEM Wholesale Price', value: 'AU$50/MWh', trend: 'down', note: 'Dec 2025 quarter — near halved YoY' },
  { label: 'Grid Connection Queue', value: '64 GW', trend: 'up', note: '46% battery storage share (Q4 2025)' },
];

// ── Derived side panel data ───────────────────────────────────────────────────

function getTrendingTopics(items) {
  const counts = {};
  items.forEach((item) => {
    item.tags.forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16)
    .map(([tag, count]) => ({ tag, count }));
}

function getBiddersInNews(items) {
  const counts = {};
  items.forEach((item) => {
    item.relatedBidders.forEach((b) => {
      counts[b] = (counts[b] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
      }`}
    >
      {children}
    </button>
  );
}

function NewsCard({ item }) {
  const catStyle = CATEGORY_STYLES[item.category] || 'bg-gray-100 text-gray-700';
  const borderColor = CATEGORY_BORDER[item.category] || 'border-l-gray-400';

  return (
    <article className={`bg-white rounded-lg border border-gray-200 border-l-4 ${borderColor} p-5 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${catStyle}`}>
            {item.category}
          </span>
          {item.geography && (
            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
              {item.geography}
            </span>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-gray-400">{daysAgo(item.date)}</div>
          <div className="text-xs text-gray-500 mt-0.5">{formatDate(item.date)}</div>
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2">{item.headline}</h3>
      <p className="text-sm text-gray-600 leading-relaxed mb-3">{item.summary}</p>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Source:{' '}
            <a href={item.sourceUrl} className="text-blue-600 hover:underline">
              {item.source}
            </a>
          </span>
        </div>

        {item.relatedBidders.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-400">Bidders:</span>
            {item.relatedBidders.map((b) => (
              <span
                key={b}
                className="inline-block px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200"
              >
                {b}
              </span>
            ))}
          </div>
        )}
      </div>

      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-100">
          {item.tags.map((tag) => (
            <span key={tag} className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function MarketPulse() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Market Pulse</h3>
      <div className="space-y-3">
        {MARKET_PULSE.map((stat) => (
          <div key={stat.label} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500">{stat.label}</span>
              <span className={`text-xs font-bold ${stat.trend === 'up' ? 'text-green-600' : 'text-red-500'}`}>
                {stat.trend === 'up' ? '▲' : '▼'}
              </span>
            </div>
            <div className="text-sm font-bold text-gray-900 mt-0.5">{stat.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{stat.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendingTopics({ topics, onTagClick }) {
  const maxCount = topics[0]?.count || 1;
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Trending Topics</h3>
      <div className="flex flex-wrap gap-1.5">
        {topics.map(({ tag, count }) => {
          const size = count / maxCount;
          const fontSize = size > 0.7 ? 'text-sm font-bold' : size > 0.4 ? 'text-xs font-semibold' : 'text-xs';
          const bg = size > 0.7 ? 'bg-blue-100 text-blue-800' : size > 0.4 ? 'bg-gray-100 text-gray-700' : 'bg-gray-50 text-gray-500';
          return (
            <button
              key={tag}
              onClick={() => onTagClick(tag)}
              className={`px-2 py-1 rounded-full ${fontSize} ${bg} hover:opacity-80 transition-opacity`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BiddersInNews({ bidders }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Key Bidders in News</h3>
      <div className="space-y-2">
        {bidders.map(({ name, count }) => (
          <div key={name} className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{name}</span>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {count} {count === 1 ? 'article' : 'articles'}
            </span>
          </div>
        ))}
        {bidders.length === 0 && <p className="text-xs text-gray-400">No bidder mentions in current filter.</p>}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function NewsPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeGeo, setActiveGeo] = useState('All');
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  const filtered = useMemo(() => {
    let items = [...newsData];

    if (activeCategory !== 'All') {
      items = items.filter((i) => i.category === activeCategory);
    }
    if (activeGeo !== 'All') {
      items = items.filter((i) => i.geography === activeGeo);
    }
    if (tagFilter) {
      items = items.filter((i) => i.tags.some((t) => t.toLowerCase() === tagFilter.toLowerCase()));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.headline.toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)) ||
          i.relatedBidders.some((b) => b.toLowerCase().includes(q)) ||
          i.source.toLowerCase().includes(q)
      );
    }

    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [activeCategory, activeGeo, search, tagFilter]);

  const trending = useMemo(() => getTrendingTopics(newsData), []);
  const biddersInNews = useMemo(() => getBiddersInNews(filtered), [filtered]);

  function handleTagClick(tag) {
    setTagFilter((prev) => (prev === tag ? '' : tag));
    setSearch('');
  }

  const hasActiveFilter = activeCategory !== 'All' || activeGeo !== 'All' || search || tagFilter;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">News & Intelligence</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Australian renewable energy market updates — {newsData.length} articles indexed
              </p>
            </div>
            <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
              Last updated: 10 Mar 2026
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6">
        {/* Filter Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col gap-3">
            {/* Topic filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-16 shrink-0">Topic</span>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <FilterButton
                    key={cat}
                    active={activeCategory === cat}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </FilterButton>
                ))}
              </div>
            </div>

            {/* Geography filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-16 shrink-0">State</span>
              <div className="flex flex-wrap gap-1.5">
                {GEOGRAPHIES.map((geo) => (
                  <FilterButton
                    key={geo}
                    active={activeGeo === geo}
                    onClick={() => setActiveGeo(geo)}
                  >
                    {geo}
                  </FilterButton>
                ))}
              </div>
            </div>

            {/* Search + active tag + clear */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-16 shrink-0">Search</span>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setTagFilter(''); }}
                placeholder="Search headlines, summaries, bidders..."
                className="flex-1 min-w-[200px] px-3 py-1.5 text-sm border border-gray-300 rounded-full focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
              {tagFilter && (
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                  <span className="text-xs text-blue-700 font-medium">#{tagFilter}</span>
                  <button onClick={() => setTagFilter('')} className="text-blue-400 hover:text-blue-700 text-xs leading-none">
                    &times;
                  </button>
                </div>
              )}
              {hasActiveFilter && (
                <button
                  onClick={() => { setActiveCategory('All'); setActiveGeo('All'); setSearch(''); setTagFilter(''); }}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-6 items-start">
          {/* News Feed */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">
                {filtered.length === newsData.length
                  ? `${newsData.length} articles`
                  : `${filtered.length} of ${newsData.length} articles`}
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
                <div className="text-gray-400 text-3xl mb-3">&#128240;</div>
                <p className="text-gray-500 font-medium">No articles match your filters.</p>
                <button
                  onClick={() => { setActiveCategory('All'); setActiveGeo('All'); setSearch(''); setTagFilter(''); }}
                  className="mt-3 text-sm text-blue-600 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((item) => (
                  <NewsCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="w-72 shrink-0 space-y-4">
            <MarketPulse />
            <TrendingTopics topics={trending} onTagClick={handleTagClick} />
            <BiddersInNews bidders={biddersInNews} />
          </div>
        </div>
      </div>
    </div>
  );
}
