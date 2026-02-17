'use client';

import { useState } from 'react';

const EXPORT_COLUMNS = [
  { key: 'no', label: '#' },
  { key: 'name', label: 'Name' },
  { key: 'archetype', label: 'Archetype' },
  { key: 'contact', label: 'Contact' },
  { key: 'conversationHeld', label: 'Conversation Held?' },
  { key: 'feedbackDate', label: 'Feedback Date' },
  { key: 'conversationType', label: 'Conversation Type' },
  { key: 'projectInterest', label: 'Project Interest' },
  { key: 'keyNotes', label: 'Key Notes' },
  { key: 'aiInsights', label: 'AI Insights' },
  { key: 'aiInsightStatus', label: 'AI Insight Status' },
];

function buildFilename(txName, ext) {
  const prefix = txName.trim() ? txName.trim().replace(/\s+/g, '_') + '_' : '';
  return `${prefix}offtaker_list.${ext}`;
}

export default function OfftakerExportBar({ filteredOfftakers, allOfftakers, selected, insightStatus }) {
  const [txName, setTxName] = useState('');

  const exportRows = () => {
    const rows = selected.size > 0 ? allOfftakers.filter((o) => selected.has(o.no)) : filteredOfftakers;
    return rows.map((r) => ({
      ...r,
      aiInsightStatus: insightStatus[r.no] || 'pending',
    }));
  };

  const exportCSV = () => {
    const rows = exportRows();
    if (rows.length === 0) return;
    const header = EXPORT_COLUMNS.map((c) => c.label).join(',');
    const lines = rows.map((r) =>
      EXPORT_COLUMNS.map((c) => {
        let v = String(r[c.key] ?? '');
        if (v.includes(',') || v.includes('"') || v.includes('\n')) {
          v = '"' + v.replace(/"/g, '""') + '"';
        }
        return v;
      }).join(',')
    );
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildFilename(txName, 'csv');
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    const rows = exportRows();
    if (rows.length === 0) return;
    const XLSX = (await import('xlsx')).default || (await import('xlsx'));
    const data = [
      EXPORT_COLUMNS.map((c) => c.label),
      ...rows.map((r) => EXPORT_COLUMNS.map((c) => r[c.key] ?? '')),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = EXPORT_COLUMNS.map((c) => ({
      wch: Math.min(Math.max(c.label.length, ...rows.map((r) => String(r[c.key] ?? '').length).slice(0, 20)) + 2, 60),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Offtakers');
    XLSX.writeFile(wb, buildFilename(txName, 'xlsx'));
  };

  const count = selected.size > 0 ? selected.size : filteredOfftakers.length;
  const label = selected.size > 0 ? 'selected' : 'filtered';

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <input
        type="text"
        placeholder="Transaction name (optional)"
        value={txName}
        onChange={(e) => setTxName(e.target.value)}
        className="border border-gray-300 rounded px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={exportCSV}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded font-medium"
      >
        Export CSV
      </button>
      <button
        onClick={exportExcel}
        className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-1.5 rounded font-medium"
      >
        Export Excel
      </button>
      <span className="text-sm text-gray-500">
        {count} {label} offtaker{count !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
