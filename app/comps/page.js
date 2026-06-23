'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  COMP_CATEGORIES, METRIC_BY_KEY, metricLabel,
  UNITS, BASES, TECHNOLOGIES, STATES, DEAL_TYPES, STATUSES, CONFIDENCE,
} from '../../lib/compsTaxonomy';

const cn = (...xs) => xs.filter(Boolean).join(' ');

const CONF_COLORS = {
  High: 'bg-emerald-100 text-emerald-800',
  Medium: 'bg-amber-100 text-amber-800',
  Low: 'bg-orange-100 text-orange-800',
  Illustrative: 'bg-slate-200 text-slate-600',
};

const MONEY_TOTAL = { '$bn': 1e9, '$m': 1e6, '$k': 1e3, '$': 1 };

// Normalise an observation to $/MW and $/MWh where possible.
function perUnit(row) {
  const v = Number(row.value);
  if (!isFinite(v)) return {};
  if (row.unit === '$/MW') return { perMw: v };
  if (row.unit === '$/MWh') return { perMwh: v };
  const mult = MONEY_TOTAL[row.unit];
  if (mult != null && (row.basis === 'total' || row.basis === 'one_off' || row.basis === 'per_annum')) {
    const abs = v * mult;
    const out = {};
    if (row.capacity_mw) out.perMw = abs / Number(row.capacity_mw);
    if (row.capacity_mwh) out.perMwh = abs / Number(row.capacity_mwh);
    return out;
  }
  return {};
}

function fmtMoneyPer(n) {
  if (n == null || !isFinite(n)) return '—';
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}m`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
  return `$${n.toFixed(2)}`;
}

function fmtValue(row) {
  const v = Number(row.value);
  if (!isFinite(v)) return '—';
  const u = row.unit || '';
  const n = (x) => x.toLocaleString(undefined, { maximumFractionDigits: 2 });
  switch (u) {
    case '$bn': return `$${n(v)}bn`;
    case '$m':  return `$${n(v)}m`;
    case '$k':  return `$${n(v)}k`;
    case '$':   return `$${n(v)}`;
    case '%':   return `${n(v)}%`;
    case 'x':   return `${n(v)}x`;
    case 'ratio': return n(v);
    case 'years': return `${n(v)} yr`;
    case 'hours': return `${n(v)} h`;
    default:
      // money-per-unit ($/MW, $/MWh, $/MW/yr, $/W, $/ha, …) keep the unit suffix
      if (u.startsWith('$')) return `$${n(v)}${u.slice(1)}`;
      return `${n(v)} ${u}`.trim(); // MW, MWh, ha, …
  }
}

function fmtCapacity(d) {
  const parts = [];
  if (d.capacity_mw) parts.push(`${Number(d.capacity_mw).toLocaleString()} MW`);
  if (d.capacity_mwh) parts.push(`${Number(d.capacity_mwh).toLocaleString()} MWh`);
  return parts.join(' / ') || '—';
}

function SourceLink({ source, url }) {
  if (!source && !url) return <span className="text-gray-300">—</span>;
  const label = source || 'source';
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 hover:underline">{label} ↗</a>
  ) : (
    <span className="text-gray-400">{label}</span>
  );
}

const EMPTY_DEAL = {
  name: '', counterparty: '', seller: '', technology: 'Solar', deal_type: 'M&A',
  state: 'NSW', capacity_mw: '', capacity_mwh: '', capacity_mwac: '', capacity_mwdc: '',
  status: 'Announced', transaction_date: '', currency: 'AUD', source: '', source_url: '', confidence: 'Medium', notes: '',
};

export default function CompsPage() {
  const [deals, setDeals] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('metrics'); // 'metrics' | 'deals'
  const [showSchema, setShowSchema] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [showMetricForm, setShowMetricForm] = useState(false);

  // filters
  const [fTech, setFTech] = useState('');
  const [fState, setFState] = useState('');
  const [fCat, setFCat] = useState('');
  const [fType, setFType] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [dRes, mRes] = await Promise.all([
      fetch('/api/comps/deals').then((r) => r.json()),
      fetch('/api/comps/metrics').then((r) => r.json()),
    ]);
    setDeals(Array.isArray(dRes) ? dRes : []);
    setMetrics(Array.isArray(mRes) ? mRes : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredMetrics = useMemo(() => metrics.filter((m) => {
    if (fTech && m.technology !== fTech) return false;
    if (fState && m.state !== fState) return false;
    if (fCat && m.category !== fCat) return false;
    if (fType && m.deal_type !== fType) return false;
    if (q) {
      const hay = `${m.deal_name} ${metricLabel(m.metric)} ${m.metric}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [metrics, fTech, fState, fCat, fType, q]);

  const filteredDeals = useMemo(() => deals.filter((d) => {
    if (fTech && d.technology !== fTech) return false;
    if (fState && d.state !== fState) return false;
    if (fType && d.deal_type !== fType) return false;
    if (q && !d.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [deals, fTech, fState, fType, q]);

  const byCategory = useMemo(() => {
    const groups = {};
    for (const m of filteredMetrics) {
      (groups[m.category] ||= []).push(m);
    }
    return groups;
  }, [filteredMetrics]);

  const stats = useMemo(() => ({
    deals: deals.length,
    observations: metrics.length,
    technologies: new Set(deals.map((d) => d.technology).filter(Boolean)).size,
    categories: new Set(metrics.map((m) => m.category)).size,
  }), [deals, metrics]);

  async function addDeal(form) {
    const res = await fetch('/api/comps/deals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    if (res.ok) { setShowDealForm(false); load(); }
    else alert('Failed to add deal');
  }
  async function addMetric(form) {
    const res = await fetch('/api/comps/metrics', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    if (res.ok) { setShowMetricForm(false); load(); }
    else alert('Failed to add metric');
  }
  async function delMetric(id) {
    if (!confirm('Delete this observation?')) return;
    await fetch('/api/comps/metrics', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setMetrics((prev) => prev.filter((m) => m.id !== id));
  }
  async function delDeal(id) {
    if (!confirm('Delete this deal and all its metrics?')) return;
    await fetch('/api/comps/deals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  const clearFilters = () => { setFTech(''); setFState(''); setFCat(''); setFType(''); setQ(''); };
  const anyFilter = fTech || fState || fCat || fType || q;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Comps Research</h1>
          <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">
            Curated stats &amp; comparables across deals — valuations, capex, capex splits (AC/DC/EPC),
            connection &amp; system-strength, opex, land &amp; rent, community contributions and more.
            Stored in a flexible per-metric schema so new comp types need no migration.
          </p>
        </div>
        <div className="flex gap-2 shrink-0 items-center">
          <a href="/comps.html" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded hover:bg-gray-50">Standalone view ↗</a>
          <button onClick={() => setShowMetricForm((v) => !v)} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">+ Metric</button>
          <button onClick={() => setShowDealForm((v) => !v)} className="px-3 py-1.5 bg-slate-700 text-white text-sm rounded hover:bg-slate-800">+ Deal</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          ['Deals tracked', stats.deals],
          ['Observations', stats.observations],
          ['Technologies', stats.technologies],
          ['Metric categories', stats.categories],
        ].map(([label, val]) => (
          <div key={label} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <div className="text-2xl font-bold text-gray-900">{val}</div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {showDealForm && <DealForm onSubmit={addDeal} onCancel={() => setShowDealForm(false)} />}
      {showMetricForm && <MetricForm deals={deals} onSubmit={addMetric} onCancel={() => setShowMetricForm(false)} />}

      {/* View toggle + schema link */}
      <div className="flex items-center gap-2 mb-3">
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          {['metrics', 'deals'].map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={cn('px-3 py-1.5 text-sm capitalize', view === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>
              {v}
            </button>
          ))}
        </div>
        <button onClick={() => setShowSchema((v) => !v)} className="text-sm text-gray-500 hover:text-gray-800 underline ml-1">
          {showSchema ? 'Hide' : 'Show'} schema reference
        </button>
      </div>

      {showSchema && <SchemaReference />}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search deal or metric…"
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-56" />
        <select value={fCat} onChange={(e) => setFCat(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
          <option value="">All categories</option>
          {COMP_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <select value={fTech} onChange={(e) => setFTech(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
          <option value="">All tech</option>
          {TECHNOLOGIES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={fState} onChange={(e) => setFState(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
          <option value="">All states</option>
          {STATES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={fType} onChange={(e) => setFType(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
          <option value="">All deal types</option>
          {DEAL_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        {anyFilter && <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-800 underline">Clear</button>}
        <span className="ml-auto text-xs text-gray-400">
          {view === 'metrics' ? `${filteredMetrics.length} observations` : `${filteredDeals.length} deals`}
        </span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : view === 'metrics' ? (
        <MetricsView byCategory={byCategory} onDelete={delMetric} />
      ) : (
        <DealsView deals={filteredDeals} onDelete={delDeal} />
      )}
    </div>
  );
}

// ── Metrics (grouped by category) ─────────────────────────────────────────
function MetricsView({ byCategory, onDelete }) {
  const cats = COMP_CATEGORIES.filter((c) => byCategory[c.key]?.length);
  if (cats.length === 0) {
    return <div className="text-center py-12 text-gray-400 text-sm bg-white border border-gray-200 rounded-lg">No observations match the filters.</div>;
  }
  return (
    <div className="space-y-5">
      {cats.map((c) => (
        <div key={c.key} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className={cn('px-4 py-2 text-sm font-semibold border-b', c.color)}>{c.label}
            <span className="ml-2 text-xs font-normal opacity-70">{byCategory[c.key].length}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Deal</th>
                <th className="text-left px-3 py-2 font-medium">Metric</th>
                <th className="text-right px-3 py-2 font-medium">Value</th>
                <th className="text-right px-3 py-2 font-medium">$/MW</th>
                <th className="text-right px-3 py-2 font-medium">$/MWh</th>
                <th className="text-left px-3 py-2 font-medium">Conf.</th>
                <th className="text-left px-3 py-2 font-medium">Source</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {byCategory[c.key].map((m) => {
                const pu = perUnit(m);
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-800">{m.deal_name}</div>
                      <div className="text-[11px] text-gray-400">{[m.technology, m.state].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{metricLabel(m.metric)}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900 whitespace-nowrap">{fmtValue(m)}</td>
                    <td className="px-3 py-2 text-right text-gray-500 whitespace-nowrap">{fmtMoneyPer(pu.perMw)}</td>
                    <td className="px-3 py-2 text-right text-gray-500 whitespace-nowrap">{fmtMoneyPer(pu.perMwh)}</td>
                    <td className="px-3 py-2">
                      {m.confidence && <span className={cn('inline-block px-1.5 py-0.5 rounded text-[10px] font-medium', CONF_COLORS[m.confidence] || 'bg-gray-100 text-gray-600')}>{m.confidence}</span>}
                    </td>
                    <td className="px-3 py-2 text-[11px] max-w-[220px] truncate" title={[m.source, m.notes].filter(Boolean).join(' — ')}><SourceLink source={m.source} url={m.source_url} /></td>
                    <td className="px-2 py-2 text-right">
                      <button onClick={() => onDelete(m.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ── Deals view ────────────────────────────────────────────────────────────
function DealsView({ deals, onDelete }) {
  if (deals.length === 0) {
    return <div className="text-center py-12 text-gray-400 text-sm bg-white border border-gray-200 rounded-lg">No deals match the filters.</div>;
  }
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Deal</th>
            <th className="text-left px-3 py-2 font-medium">Type</th>
            <th className="text-left px-3 py-2 font-medium">Tech</th>
            <th className="text-left px-3 py-2 font-medium">State</th>
            <th className="text-left px-3 py-2 font-medium">Capacity</th>
            <th className="text-left px-3 py-2 font-medium">Date</th>
            <th className="text-center px-3 py-2 font-medium">Metrics</th>
            <th className="text-left px-3 py-2 font-medium">Conf.</th>
            <th className="px-2 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {deals.map((d) => (
            <tr key={d.id} className="hover:bg-gray-50">
              <td className="px-4 py-2">
                <div className="font-medium text-gray-800">{d.name}</div>
                {d.counterparty && d.counterparty !== '—' && <div className="text-[11px] text-gray-400">{d.counterparty}{d.seller && d.seller !== '—' ? ` ← ${d.seller}` : ''}</div>}
                {(d.source || d.source_url) && <div className="text-[11px] mt-0.5"><SourceLink source={d.source} url={d.source_url} /></div>}
              </td>
              <td className="px-3 py-2 text-gray-600">{d.deal_type || '—'}</td>
              <td className="px-3 py-2 text-gray-600">{d.technology || '—'}</td>
              <td className="px-3 py-2 text-gray-600">{d.state || '—'}</td>
              <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{fmtCapacity(d)}</td>
              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{d.transaction_date ? String(d.transaction_date).slice(0, 10) : '—'}</td>
              <td className="px-3 py-2 text-center text-gray-600">{d.metric_count ?? 0}</td>
              <td className="px-3 py-2">
                {d.confidence && <span className={cn('inline-block px-1.5 py-0.5 rounded text-[10px] font-medium', CONF_COLORS[d.confidence] || 'bg-gray-100 text-gray-600')}>{d.confidence}</span>}
              </td>
              <td className="px-2 py-2 text-right">
                <button onClick={() => onDelete(d.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Schema reference (self-documenting taxonomy) ──────────────────────────
function SchemaReference() {
  return (
    <div className="bg-slate-50 border border-gray-200 rounded-lg p-4 mb-4">
      <p className="text-xs text-gray-500 mb-3">
        The schema is intentionally tall: each row is one observation
        (<code className="bg-white px-1 rounded border">deal → category → metric → value + unit + basis</code>).
        Categories &amp; metrics below are the canonical taxonomy (<code className="bg-white px-1 rounded border">lib/compsTaxonomy.js</code>).
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {COMP_CATEGORIES.map((c) => (
          <div key={c.key} className="bg-white border border-gray-200 rounded p-3">
            <div className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium border mb-2', c.color)}>{c.label}</div>
            <ul className="text-[11px] text-gray-600 space-y-0.5">
              {c.metrics.map((m) => (
                <li key={m.key} className="flex justify-between gap-2">
                  <span>{m.label}</span>
                  <span className="text-gray-400 whitespace-nowrap">{m.defaultUnit}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Add Deal form ─────────────────────────────────────────────────────────
function DealForm({ onSubmit, onCancel }) {
  const [f, setF] = useState(EMPTY_DEAL);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="bg-slate-50 border border-gray-200 rounded-lg p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
      <Field label="Deal name *"><input required value={f.name} onChange={set('name')} className="inp" /></Field>
      <Field label="Counterparty / buyer"><input value={f.counterparty} onChange={set('counterparty')} className="inp" /></Field>
      <Field label="Seller / vendor"><input value={f.seller} onChange={set('seller')} className="inp" /></Field>
      <Field label="Deal type"><select value={f.deal_type} onChange={set('deal_type')} className="inp">{DEAL_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
      <Field label="Technology"><select value={f.technology} onChange={set('technology')} className="inp">{TECHNOLOGIES.map((t) => <option key={t}>{t}</option>)}</select></Field>
      <Field label="State"><select value={f.state} onChange={set('state')} className="inp">{STATES.map((s) => <option key={s}>{s}</option>)}</select></Field>
      <Field label="Status"><select value={f.status} onChange={set('status')} className="inp">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
      <Field label="Transaction date"><input type="date" value={f.transaction_date} onChange={set('transaction_date')} className="inp" /></Field>
      <Field label="Capacity MW"><input type="number" step="any" value={f.capacity_mw} onChange={set('capacity_mw')} className="inp" /></Field>
      <Field label="Capacity MWh"><input type="number" step="any" value={f.capacity_mwh} onChange={set('capacity_mwh')} className="inp" /></Field>
      <Field label="MWac"><input type="number" step="any" value={f.capacity_mwac} onChange={set('capacity_mwac')} className="inp" /></Field>
      <Field label="MWdc"><input type="number" step="any" value={f.capacity_mwdc} onChange={set('capacity_mwdc')} className="inp" /></Field>
      <Field label="Confidence"><select value={f.confidence} onChange={set('confidence')} className="inp">{CONFIDENCE.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Source"><input value={f.source} onChange={set('source')} className="inp" placeholder="e.g. Energy-Storage.news" /></Field>
      <Field label="Source URL" wide><input value={f.source_url} onChange={set('source_url')} className="inp" placeholder="https://…" /></Field>
      <Field label="Notes" wide><input value={f.notes} onChange={set('notes')} className="inp" /></Field>
      <div className="md:col-span-4 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
        <button type="submit" className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Save deal</button>
      </div>
      <style jsx>{`.inp{width:100%;border:1px solid #d1d5db;border-radius:0.375rem;padding:0.375rem 0.5rem;font-size:0.875rem}`}</style>
    </form>
  );
}

// ── Add Metric form ───────────────────────────────────────────────────────
function MetricForm({ deals, onSubmit, onCancel }) {
  const [f, setF] = useState({
    deal_id: '', metric: '', value: '', unit: '', basis: '', source: '', source_url: '', confidence: 'Medium', notes: '',
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // When metric changes, pre-fill unit + basis from taxonomy defaults.
  function onMetricChange(e) {
    const metric = e.target.value;
    const def = METRIC_BY_KEY[metric];
    setF((p) => ({ ...p, metric, unit: def?.defaultUnit || p.unit, basis: def?.defaultBasis || p.basis }));
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
      <Field label="Deal *">
        <select required value={f.deal_id} onChange={set('deal_id')} className="inp">
          <option value="">Select deal…</option>
          {deals.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Field>
      <Field label="Metric *">
        <select required value={f.metric} onChange={onMetricChange} className="inp">
          <option value="">Select metric…</option>
          {COMP_CATEGORIES.map((c) => (
            <optgroup key={c.key} label={c.label}>
              {c.metrics.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </optgroup>
          ))}
        </select>
      </Field>
      <Field label="Value"><input type="number" step="any" value={f.value} onChange={set('value')} className="inp" /></Field>
      <Field label="Unit"><select value={f.unit} onChange={set('unit')} className="inp"><option value="">—</option>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></Field>
      <Field label="Basis"><select value={f.basis} onChange={set('basis')} className="inp"><option value="">—</option>{BASES.map((b) => <option key={b}>{b}</option>)}</select></Field>
      <Field label="Confidence"><select value={f.confidence} onChange={set('confidence')} className="inp">{CONFIDENCE.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Source"><input value={f.source} onChange={set('source')} className="inp" placeholder="publisher" /></Field>
      <Field label="Source URL" wide><input value={f.source_url} onChange={set('source_url')} className="inp" placeholder="https://…" /></Field>
      <Field label="Notes"><input value={f.notes} onChange={set('notes')} className="inp" /></Field>
      <div className="md:col-span-4 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
        <button type="submit" className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Save metric</button>
      </div>
      <style jsx>{`.inp{width:100%;border:1px solid #d1d5db;border-radius:0.375rem;padding:0.375rem 0.5rem;font-size:0.875rem;background:white}`}</style>
    </form>
  );
}

function Field({ label, children, wide }) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
