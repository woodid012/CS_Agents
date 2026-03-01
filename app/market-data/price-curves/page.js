'use client';

import { useState, useEffect, useMemo } from 'react';

const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT'];
const SCENARIOS = ['Base', 'High', 'Low', 'P10', 'P50', 'P90'];

const EMPTY_FORM = {
  scenario: 'Base', state: 'NSW', year: new Date().getFullYear(),
  energy_price: '', lgc_price: '', source: '', notes: '',
};

export default function PriceCurvesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterState, setFilterState] = useState('');
  const [filterScenario, setFilterScenario] = useState('');

  useEffect(() => {
    fetch('/api/market-data/price-curves')
      .then((r) => r.json())
      .then((d) => { setRows(d); setLoading(false); });
  }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (filterState && r.state !== filterState) return false;
    if (filterScenario && r.scenario !== filterScenario) return false;
    return true;
  }), [rows, filterState, filterScenario]);

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/market-data/price-curves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, year: Number(form.year), energy_price: form.energy_price === '' ? null : Number(form.energy_price), lgc_price: form.lgc_price === '' ? null : Number(form.lgc_price) }),
    });
    const newRow = await res.json();
    setRows((prev) => [...prev, newRow].sort((a, b) => a.state.localeCompare(b.state) || a.scenario.localeCompare(b.scenario) || a.year - b.year));
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this row?')) return;
    await fetch('/api/market-data/price-curves', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const statesInData = [...new Set(rows.map((r) => r.state))].sort();
  const scenariosInData = [...new Set(rows.map((r) => r.scenario))].sort();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-700">Price Curves</h2>
          <p className="text-xs text-gray-400 mt-0.5">Energy and LGC price forecasts by state, scenario, and year.</p>
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Scenario</label>
            <select value={form.scenario} onChange={(e) => setForm({ ...form, scenario: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
              {SCENARIOS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
            <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
            <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Energy Price ($/MWh)</label>
            <input type="number" step="0.01" placeholder="e.g. 85.00" value={form.energy_price} onChange={(e) => setForm({ ...form, energy_price: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">LGC Price ($/MWh)</label>
            <input type="number" step="0.01" placeholder="e.g. 30.00" value={form.lgc_price} onChange={(e) => setForm({ ...form, lgc_price: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
            <input type="text" placeholder="e.g. AEMO, Endgame" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div className="md:col-span-2">
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
        <select value={filterState} onChange={(e) => setFilterState(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">All States</option>
          {statesInData.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filterScenario} onChange={(e) => setFilterScenario(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">All Scenarios</option>
          {scenariosInData.map((s) => <option key={s}>{s}</option>)}
        </select>
        {(filterState || filterScenario) && (
          <button onClick={() => { setFilterState(''); setFilterScenario(''); }} className="text-sm text-gray-500 hover:text-gray-800 underline">Clear</button>
        )}
        <span className="ml-auto text-xs text-gray-400 self-center">{filtered.length} rows</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Scenario', 'State', 'Year', 'Energy Price ($/MWh)', 'LGC Price ($/MWh)', 'Source', 'Notes', ''].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">Loading...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">No data yet. Click "+ Add Row" to get started.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">{r.scenario}</span></td>
                <td className="px-4 py-2.5 font-medium text-gray-700">{r.state}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.year}</td>
                <td className="px-4 py-2.5 text-gray-700">{r.energy_price != null ? `$${Number(r.energy_price).toFixed(2)}` : '—'}</td>
                <td className="px-4 py-2.5 text-gray-700">{r.lgc_price != null ? `$${Number(r.lgc_price).toFixed(2)}` : '—'}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{r.source || '—'}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs max-w-xs truncate">{r.notes || '—'}</td>
                <td className="px-4 py-2.5">
                  <button onClick={() => handleDelete(r.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
