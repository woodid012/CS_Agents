'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const UPDATE_TYPE_COLORS = {
  'Meeting Notes':       { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200' },
  'News/Market Update':  { bg: 'bg-amber-100',  text: 'text-amber-800',  border: 'border-amber-200' },
  'Call Summary':        { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  'Relationship Update': { bg: 'bg-emerald-100',text: 'text-emerald-800',border: 'border-emerald-200' },
  'Financial Update':    { bg: 'bg-rose-100',   text: 'text-rose-800',   border: 'border-rose-200' },
};

function UpdateTypeTag({ type }) {
  const c = UPDATE_TYPE_COLORS[type] || { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
      {type}
    </span>
  );
}

function InsightCard({ insight }) {
  const dateStr = insight.info_date
    ? new Date(insight.info_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : insight.created_at
    ? new Date(insight.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {insight.bidder_name || 'Unknown Bidder'}
          </p>
        </div>
        <UpdateTypeTag type={insight.update_type} />
      </div>

      <p className="text-sm text-gray-700 leading-relaxed">{insight.cs_insight}</p>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-400 flex items-center gap-2">
          {insight.analyst_name && (
            <span className="font-medium text-gray-500">{insight.analyst_name}</span>
          )}
          {dateStr && <span>{dateStr}</span>}
        </div>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    fetch('/api/insights')
      .then((r) => r.json())
      .then((data) => {
        setInsights(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updateTypes = ['All', ...Object.keys(UPDATE_TYPE_COLORS)];
  const filtered = filterType === 'All' ? insights : insights.filter((i) => i.update_type === filterType);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page Header */}
      <div className="bg-slate-900 border-b border-slate-700 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Analyst Insights</h1>
            <p className="text-slate-400 text-sm mt-0.5">Recent CS Capital insights from analyst submissions</p>
          </div>
          <Link
            href="/insights/submit"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <span className="text-base leading-none">+</span>
            Submit Insight
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 items-center bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Type:</span>
          {updateTypes.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                filterType === t
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {t}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400">
            {filtered.length} insight{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Insights grid */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading insights…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-gray-400 text-sm">
              {insights.length === 0
                ? 'No insights submitted yet.'
                : 'No insights match the current filter.'}
            </p>
            {insights.length === 0 && (
              <Link
                href="/insights/submit"
                className="inline-block text-sm text-blue-600 hover:underline font-medium"
              >
                Submit the first insight →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
