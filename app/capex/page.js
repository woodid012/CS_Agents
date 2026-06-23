'use client';

import { useState, useEffect, useMemo } from 'react';

const TYPE_COLORS = {
  capex:   'bg-blue-50 text-blue-700 border-blue-200',
  opex:    'bg-green-50 text-green-700 border-green-200',
  finance: 'bg-purple-50 text-purple-700 border-purple-200',
  devex:   'bg-orange-50 text-orange-700 border-orange-200',
};

function typeColor(t) {
  if (!t) return 'bg-gray-50 text-gray-500 border-gray-200';
  return TYPE_COLORS[t.toLowerCase()] || 'bg-gray-50 text-gray-600 border-gray-200';
}

function fmtValue(v) {
  if (v == null || v === '') return '—';
  return Number(v).toLocaleString();
}

export default function ProjectCapexPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterFile, setFilterFile] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/capex/data-capex')
      .then((r) => r.json())
      .then((d) => { setRows(d); setLoading(false); });
  }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this row?')) return;
    await fetch('/api/capex/data-capex', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const typesInData = [...new Set(rows.map((r) => r.type).filter(Boolean))].sort();
  const filesInData = [...new Set(rows.map((r) => r.file_name).filter(Boolean))].sort();

  const filtered = useMemo(() => rows.filter((r) => {
    if (filterType && r.type !== filterType) return false;
    if (filterFile && r.file_name !== filterFile) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !String(r.name || '').toLowerCase().includes(q) &&
        !String(r.reference || '').toLowerCase().includes(q) &&
        !String(r.type || '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  }), [rows, filterType, filterFile, search]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Project Capex</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cost line items scraped from project financial models.</p>
        </div>
        <span className="text-xs text-gray-400 self-center">{rows.length} total rows</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input
          type="text"
          placeholder="Search name / reference / type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-64"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">All Types</option>
          {typesInData.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select
          value={filterFile}
          onChange={(e) => setFilterFile(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm max-w-xs"
        >
          <option value="">All Files</option>
          {filesInData.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        {(filterType || filterFile || search) && (
          <button
            onClick={() => { setFilterType(''); setFilterFile(''); setSearch(''); }}
            className="text-sm text-gray-400 hover:text-gray-700 underline"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400 self-center">
          {filtered.length} of {rows.length} rows
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['File', 'Reference', 'Name', 'Type', 'Value', 'Unit', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Loading...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                  {rows.length === 0 ? 'No data yet — run the scraper to populate.' : 'No rows match the current filters.'}
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 group">
                <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[180px]">
                  <span className="truncate block" title={r.file_name}>{r.file_name || '—'}</span>
                </td>
                <td className="px-4 py-2.5 text-gray-600 text-xs">{r.reference || '—'}</td>
                <td className="px-4 py-2.5 text-gray-800 font-medium max-w-[240px]">
                  <span className="truncate block" title={r.name}>{r.name || '—'}</span>
                </td>
                <td className="px-4 py-2.5">
                  {r.type
                    ? <span className={`px-2 py-0.5 rounded text-xs font-medium border ${typeColor(r.type)}`}>{r.type}</span>
                    : <span className="text-gray-400">—</span>
                  }
                </td>
                <td className="px-4 py-2.5 text-gray-700 font-mono text-right tabular-nums">{fmtValue(r.value)}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{r.unit || '—'}</td>
                <td className="px-4 py-2.5 w-10">
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-xs text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
