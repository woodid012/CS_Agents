'use client';

import { useState } from 'react';

const COLUMNS = [
  { key: 'no', label: '#', w: 'w-8' },
  { key: 'name', label: 'Name', w: 'w-28' },
  { key: 'parentOwner', label: 'Parent', w: 'w-24' },
  { key: 'geography', label: 'Geo', w: 'w-20' },
  { key: 'tier', label: 'T', w: 'w-8' },
  { key: 'type', label: 'Type', w: 'w-16' },
  { key: 'csInsights', label: 'CS Insights', w: 'w-36' },
  { key: 'aiInsights', label: 'AI Insights', w: 'w-56' },
  { key: 'contact', label: 'Contact', w: 'w-24' },
  { key: 'email', label: 'Email', w: 'w-28' },
  { key: 'phone', label: 'Phone', w: 'w-20' },
  { key: 'aiScore', label: 'AI Score', w: 'w-16' },
];

function tierBadge(tier) {
  if (!tier && tier !== 0) return null;
  const colors = {
    1: 'bg-green-100 text-green-800',
    2: 'bg-yellow-100 text-yellow-800',
    3: 'bg-gray-200 text-gray-600',
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${colors[tier] || 'bg-gray-100'}`}>
      {tier}
    </span>
  );
}

function typeBadge(type) {
  if (!type) return null;
  const isStrat = type === 'Strategic';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${isStrat ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
      {isStrat ? 'Strat' : 'Fin'}
    </span>
  );
}

function aiScoreBadge(score, label, reason) {
  if (!score) return <span className="text-gray-300">-</span>;
  const colors = {
    A: 'bg-emerald-500 text-white',
    B: 'bg-blue-500 text-white',
    C: 'bg-yellow-400 text-yellow-900',
    D: 'bg-orange-400 text-white',
    F: 'bg-red-500 text-white',
  };
  return (
    <span
      title={reason}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold cursor-help ${colors[label] || 'bg-gray-300'}`}
    >
      {label}
    </span>
  );
}

function AiInsightCell({ bidder, insightStatus, onAccept, onReject }) {
  const [expanded, setExpanded] = useState(false);
  const text = bidder.aiInsights;
  if (!text) return null;

  const status = insightStatus[bidder.no];

  if (status === 'accepted') {
    return (
      <div className="space-y-1">
        <p className="text-[11px] text-green-800 leading-tight line-clamp-2">{text}</p>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-600">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
            Accepted
          </span>
          <button onClick={() => onReject(bidder.no)} className="text-[10px] text-gray-400 hover:text-red-500 underline">reject</button>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="space-y-1">
        <p className="text-[11px] text-gray-400 leading-tight line-clamp-1 line-through">{text.slice(0, 60)}</p>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-400">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
            Rejected
          </span>
          <button onClick={() => onAccept(bidder.no)} className="text-[10px] text-gray-400 hover:text-green-600 underline">accept</button>
        </div>
      </div>
    );
  }

  // Pending — show truncated with inline accept/reject
  return (
    <div className="space-y-1">
      {expanded ? (
        <p className="text-[11px] text-indigo-700 leading-tight whitespace-normal">{text}</p>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="text-left text-[11px] text-indigo-600 hover:text-indigo-800 leading-tight line-clamp-2 w-full"
          title="Click to expand"
        >
          {text}
        </button>
      )}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onAccept(bidder.no)}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-green-50 text-green-700 hover:bg-green-600 hover:text-white border border-green-200 hover:border-green-600 transition-colors"
        >
          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
          Accept
        </button>
        <button
          onClick={() => onReject(bidder.no)}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-200 hover:border-red-500 transition-colors"
        >
          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
          Reject
        </button>
        {expanded && (
          <button onClick={() => setExpanded(false)} className="text-[10px] text-gray-400 hover:text-gray-600 ml-1">collapse</button>
        )}
      </div>
    </div>
  );
}

export default function BidderTable({ bidders, selected, setSelected, insightStatus, onAcceptInsight, onRejectInsight }) {
  const [sortKey, setSortKey] = useState('no');
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = [...bidders].sort((a, b) => {
    let av = a[sortKey] ?? '';
    let bv = b[sortKey] ?? '';
    if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av;
    av = String(av).toLowerCase();
    bv = String(bv).toLowerCase();
    if (av < bv) return sortAsc ? -1 : 1;
    if (av > bv) return sortAsc ? 1 : -1;
    return 0;
  });

  const allSelected = bidders.length > 0 && bidders.every((b) => selected.has(b.no));

  const toggleAll = () => {
    if (allSelected) {
      setSelected((s) => {
        const next = new Set(s);
        bidders.forEach((b) => next.delete(b.no));
        return next;
      });
    } else {
      setSelected((s) => {
        const next = new Set(s);
        bidders.forEach((b) => next.add(b.no));
        return next;
      });
    }
  };

  const toggleOne = (no) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(no)) next.delete(no);
      else next.add(no);
      return next;
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-auto max-h-[calc(100vh-220px)]">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-gray-100 z-10">
          <tr>
            <th className="px-1 py-1.5 w-7">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded w-3 h-3" />
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className={`px-1.5 py-1.5 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 select-none whitespace-nowrap text-[11px] ${col.w} ${col.key === 'aiScore' ? 'text-center' : ''}`}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-0.5 text-[9px]">{sortAsc ? '\u25B2' : '\u25BC'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((b) => (
            <tr
              key={b.no}
              className={`border-t border-gray-100 hover:bg-blue-50/60 ${selected.has(b.no) ? 'bg-blue-50' : ''}`}
            >
              <td className="px-1 py-1">
                <input type="checkbox" checked={selected.has(b.no)} onChange={() => toggleOne(b.no)} className="rounded w-3 h-3" />
              </td>
              {COLUMNS.map((col) => (
                <td
                  key={col.key}
                  className={`px-1.5 py-1 ${
                    col.key === 'aiInsights' ? 'whitespace-normal min-w-[220px] max-w-[320px]' :
                    col.key === 'csInsights' ? 'whitespace-normal max-w-[200px]' :
                    col.key === 'aiScore' ? 'text-center' :
                    'whitespace-nowrap truncate max-w-[160px]'
                  }`}
                >
                  {col.key === 'tier' ? tierBadge(b.tier) :
                   col.key === 'type' ? typeBadge(b.type) :
                   col.key === 'aiScore' ? aiScoreBadge(b.aiScore, b.aiLabel, b.aiScoreReason) :
                   col.key === 'aiInsights' ? (
                     <AiInsightCell
                       bidder={b}
                       insightStatus={insightStatus}
                       onAccept={onAcceptInsight}
                       onReject={onRejectInsight}
                     />
                   ) :
                   col.key === 'csInsights' ? (
                     <span className="text-[11px] leading-tight line-clamp-2">{b.csInsights}</span>
                   ) :
                   (b[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length + 1} className="text-center py-8 text-gray-400">
                No bidders match your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
