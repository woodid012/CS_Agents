'use client';

import { useState } from 'react';

const COLUMNS = [
  { key: 'no', label: '#', w: 'w-7' },
  { key: 'name', label: 'Name', w: 'w-24' },
  { key: 'archetype', label: 'Archetype', w: 'w-20' },
  { key: 'contact', label: 'Contact', w: 'w-20' },
  { key: 'conversationHeld', label: 'Conv Held?', w: 'w-12' },
  { key: 'feedbackDate', label: 'Feedback Date', w: 'w-16' },
  { key: 'conversationType', label: 'Conv Type', w: 'w-14' },
  { key: 'projectInterest', label: 'Project Interest', w: 'w-40' },
  { key: 'keyNotes', label: 'Key Notes', w: 'w-44' },
  { key: 'aiInsights', label: 'AI Insights', w: 'w-44' },
];

const ARCHETYPE_COLORS = {
  'IG Grade Gentailers': 'bg-blue-100 text-blue-800',
  'Corporates': 'bg-emerald-100 text-emerald-800',
  'Financial/Trading Houses': 'bg-purple-100 text-purple-800',
  'Small Retailers': 'bg-orange-100 text-orange-800',
};

function archetypeBadge(archetype) {
  if (!archetype) return null;
  const color = ARCHETYPE_COLORS[archetype] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${color}`}>
      {archetype}
    </span>
  );
}

function convHeldBadge(val) {
  if (!val && val !== 'No') return null;
  const s = String(val).trim().toLowerCase();
  const isYes = s === 'yes' || s === 'y';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${isYes ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
      {isYes ? 'Yes' : 'No'}
    </span>
  );
}

function ExpandableCell({ text }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return <span className="text-gray-300">-</span>;

  if (expanded) {
    return (
      <div className="space-y-1">
        <p className="text-[10px] text-gray-700 leading-tight">{text}</p>
        <button onClick={() => setExpanded(false)} className="text-[9px] text-gray-400 hover:text-gray-600">collapse</button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setExpanded(true)}
      className="text-left text-[10px] text-gray-600 hover:text-gray-900 leading-tight line-clamp-2 w-full"
      title="Click to expand"
    >
      {text}
    </button>
  );
}

function AiInsightCell({ offtaker, insightStatus, onAccept, onReject }) {
  const [expanded, setExpanded] = useState(false);
  const text = offtaker.aiInsights;
  if (!text) return null;

  const status = insightStatus[offtaker.no];

  if (status === 'accepted') {
    return (
      <div className="space-y-1">
        <p className="text-[10px] text-green-800 leading-tight line-clamp-2">{text}</p>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-green-600">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
            OK
          </span>
          <button onClick={() => onReject(offtaker.no)} className="text-[9px] text-gray-400 hover:text-red-500 underline">rej</button>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="space-y-1">
        <p className="text-[10px] text-gray-400 leading-tight line-clamp-1 line-through">{text.slice(0, 50)}</p>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-red-400">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
            Rej
          </span>
          <button onClick={() => onAccept(offtaker.no)} className="text-[9px] text-gray-400 hover:text-green-600 underline">acc</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {expanded ? (
        <p className="text-[10px] text-indigo-700 leading-tight whitespace-normal">{text}</p>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="text-left text-[10px] text-indigo-600 hover:text-indigo-800 leading-tight line-clamp-2 w-full"
          title="Click to expand"
        >
          {text}
        </button>
      )}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onAccept(offtaker.no)}
          className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-semibold rounded bg-green-50 text-green-700 hover:bg-green-600 hover:text-white border border-green-200 hover:border-green-600 transition-colors"
        >
          <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
          Acc
        </button>
        <button
          onClick={() => onReject(offtaker.no)}
          className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-semibold rounded bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-200 hover:border-red-500 transition-colors"
        >
          <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
          Rej
        </button>
        {expanded && (
          <button onClick={() => setExpanded(false)} className="text-[9px] text-gray-400 hover:text-gray-600 ml-0.5">-</button>
        )}
      </div>
    </div>
  );
}

export default function OfftakerTable({ offtakers, selected, setSelected, insightStatus, onAcceptInsight, onRejectInsight }) {
  const [sortKey, setSortKey] = useState('no');
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (key) => {
    if (key === 'projectInterest' || key === 'keyNotes') return;
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = [...offtakers].sort((a, b) => {
    let av = a[sortKey] ?? '';
    let bv = b[sortKey] ?? '';
    if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av;
    av = String(av).toLowerCase();
    bv = String(bv).toLowerCase();
    if (av < bv) return sortAsc ? -1 : 1;
    if (av > bv) return sortAsc ? 1 : -1;
    return 0;
  });

  const allSelected = offtakers.length > 0 && offtakers.every((o) => selected.has(o.no));

  const toggleAll = () => {
    if (allSelected) {
      setSelected((s) => {
        const next = new Set(s);
        offtakers.forEach((o) => next.delete(o.no));
        return next;
      });
    } else {
      setSelected((s) => {
        const next = new Set(s);
        offtakers.forEach((o) => next.add(o.no));
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
      <table className="w-full text-[10px]">
        <thead className="sticky top-0 bg-gray-100 z-10">
          <tr>
            <th className="px-0.5 py-1 w-6">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded w-3 h-3" />
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className={`px-1 py-1 text-left font-semibold text-gray-600 select-none whitespace-nowrap text-[10px] ${col.w} ${(col.key === 'projectInterest' || col.key === 'keyNotes') ? '' : 'cursor-pointer hover:bg-gray-200'}`}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-0.5 text-[8px]">{sortAsc ? '\u25B2' : '\u25BC'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((o) => (
            <tr
              key={o.no}
              className={`border-t border-gray-100 hover:bg-blue-50/60 ${selected.has(o.no) ? 'bg-blue-50' : ''}`}
            >
              <td className="px-0.5 py-0.5">
                <input type="checkbox" checked={selected.has(o.no)} onChange={() => toggleOne(o.no)} className="rounded w-3 h-3" />
              </td>
              {COLUMNS.map((col) => (
                <td
                  key={col.key}
                  className={`px-1 py-0.5 ${
                    col.key === 'projectInterest' || col.key === 'keyNotes' ? 'whitespace-normal min-w-[160px] max-w-[260px]' :
                    col.key === 'aiInsights' ? 'whitespace-normal min-w-[160px] max-w-[260px]' :
                    col.key === 'name' ? 'whitespace-nowrap truncate max-w-[120px]' :
                    col.key === 'contact' ? 'whitespace-nowrap truncate max-w-[100px]' :
                    'whitespace-nowrap truncate max-w-[120px]'
                  }`}
                  title={col.key === 'name' || col.key === 'contact' ? (o[col.key] ?? '') : undefined}
                >
                  {col.key === 'archetype' ? archetypeBadge(o.archetype) :
                   col.key === 'conversationHeld' ? convHeldBadge(o.conversationHeld) :
                   col.key === 'projectInterest' ? (
                     <ExpandableCell text={o.projectInterest} />
                   ) :
                   col.key === 'keyNotes' ? (
                     <ExpandableCell text={o.keyNotes} />
                   ) :
                   col.key === 'aiInsights' ? (
                     <AiInsightCell
                       offtaker={o}
                       insightStatus={insightStatus}
                       onAccept={onAcceptInsight}
                       onReject={onRejectInsight}
                     />
                   ) :
                   (o[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length + 1} className="text-center py-8 text-gray-400">
                No offtakers match your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
