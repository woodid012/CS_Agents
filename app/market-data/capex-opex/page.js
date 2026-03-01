'use client';

import { useState, useEffect, useMemo } from 'react';

const TECHNOLOGIES = ['Solar', 'Wind', 'BESS', 'Solar + BESS', 'Wind + BESS', 'Offshore Wind', 'Hybrid'];
const REGIONS = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'National'];

const EMPTY_FORM = {
  technology: 'Solar', scale_mw: '', capex_per_mw: '', opex_per_mw_yr: '',
  region: 'National', reference_year: new Date().getFullYear(), source: '', notes: '',
};

const TECH_COLORS = {
  'Solar': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Wind': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'BESS': 'bg-purple-50 text-purple-700 border-purple-200',
  'Solar + BESS': 'bg-orange-50 text-orange-700 border-orange-200',
  'Wind + BESS': 'bg-teal-50 text-teal-700 border-teal-200',
  'Offshore Wind': 'bg-blue-50 text-blue-700 border-blue-200',
  'Hybrid': 'bg-gray-50 text-gray-700 border-gray-200',
};

export default function CapexOpexPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterTech, setFilterTech] = useState('');
  const [filterRegion, setFilterRegion] = useState('');

  useEffect(() => {
    fetch('/api/market-data/capex-opex')
      .then((r) => r.json())
      .then((d) => { setRows(d); setLoading(false); });
  }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (filterTech && r.technology !== filterTech) return false;
    if (filterRegion && r.region !== filterRegion) return false;
    return true;
  }), [rows, filterTech, filterRegion]);

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      scale_mw: form.scale_mw === '' ? null : Number(form.scale_mw),
      capex_per_mw: form.capex_per_mw === '' ? null : Number(form.capex_per_mw),
      opex_per_mw_yr: form.opex_per_mw_yr === '' ? null : Number(form.opex_per_mw_yr),
      reference_year: Number(form.reference_year),
    };
    const res = await fetch('/api/market-data/capex-opex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const newRow = await res.json();
    setRows((prev) => [...prev, newRow].sort((a, b) => a.technology.localeCompare(b.technology)));
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this row?')) return;
    await fetch('/api/market-data/capex-opex', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const techsInData = [...new Set(rows.map((r) => r.technology))].sort();
  const regionsInData = [...new Set(rows.map((r) => r.region).filter(Boolean))].sort();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-700">Capex / Opex</h2>
          <p className="text-xs text-gray-400 mt-0.5">Capital and operating cost benchmarks by technology, scale, and region.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          + Add Row
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Technology</label>
            <select value={form.technology} onChange={(e) => setForm({ ...form, technology: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
              {TECHNOLOGIES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Scale (MW)</label>
            <input type="number" step="0.1" placeholder="e.g. 200" value={form.scale_mw} onChange={(e) => setForm({ ...form, scale_mw: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Capex ($/MW)</label>
            <input type="number" placeholder="e.g. 1200000" value={form.capex_per_mw} onChange={(e) => setForm({ ...form, capex_per_mw: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Opex ($/MW/yr)</label>
            <input type="number" placeholder="e.g. 18000" value={form.opex_per_mw_yr} onChange={(e) => setForm({ ...form, opex_per_mw_yr: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Region</label>
            <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
              {REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reference Year</label>
            <input type="number" value={form.reference_year} onChange={(e) => setForm({ ...form, reference_year: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
            <input type="text" placeholder="e.g. BNEF, internal" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div className="md:col-span-4 flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-3">
        <select value={filterTech} onChange={(e) => setFilterTech(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">All Technologies</option>
          {techsInData.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">All Regions</option>
          {regionsInData.map((r) => <option key={r}>{r}</option>)}
        </select>
        {(filterTech || filterRegion) && (
          <button onClick={() => { setFilterTech(''); setFilterRegion(''); }} className="text-sm text-gray-500 hover:text-gray-800 underline">Clear</button>
        )}
        <span className="ml-auto text-xs text-gray-400 self-center">{filtered.length} rows</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Technology', 'Scale (MW)', 'Capex ($/MW)', 'Opex ($/MW/yr)', 'Region', 'Ref. Year', 'Source', 'Notes', ''].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={9} className="text-center py-8 text-gray-400 text-sm">Loading...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center py-8 text-gray-400 text-sm">No data yet. Click "+ Add Row" to get started.</td></tr>
            )}
            {filtered.map((r) => {
              const techClass = TECH_COLORS[r.technology] || 'bg-gray-50 text-gray-700 border-gray-200';
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-xs font-medium border ${techClass}`}>{r.technology}</span></td>
                  <td className="px-4 py-2.5 text-gray-600">{r.scale_mw != null ? `${Number(r.scale_mw).toLocaleString()} MW` : '—'}</td>
                  <td className="px-4 py-2.5 text-gray-700">{r.capex_per_mw != null ? `$${Number(r.capex_per_mw).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-2.5 text-gray-700">{r.opex_per_mw_yr != null ? `$${Number(r.opex_per_mw_yr).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.region || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.reference_year || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{r.source || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs max-w-xs truncate">{r.notes || '—'}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => handleDelete(r.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
