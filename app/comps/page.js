'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  COMP_CATEGORIES, CATEGORY_BY_KEY, METRIC_BY_KEY, metricLabel,
  UNITS, BASES, TECHNOLOGIES, STATES, DEAL_TYPES, STATUSES, CONFIDENCE, SCHEMES, PROGRAMS, DATA_CLASSES,
} from '../../lib/compsTaxonomy';

const cn = (...xs) => xs.filter(Boolean).join(' ');

const CONF_COLORS = {
  High: 'bg-emerald-100 text-emerald-800',
  Medium: 'bg-amber-100 text-amber-800',
  Low: 'bg-orange-100 text-orange-800',
};

const CLASS_COLORS = {
  Real: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Benchmark: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
};

const MONEY_TOTAL = { '$bn': 1e9, '$m': 1e6, '$k': 1e3, '$': 1 };

// Bar colours per metric category (mirrors the standalone palette).
const CAT_HEX = {
  valuation: '#6366f1', capex: '#10b981', capex_split: '#14b8a6', connection: '#0ea5e9',
  opex: '#f59e0b', land: '#84cc16', community: '#f43f5e', offtake: '#8b5cf6',
  financing: '#06b6d4', returns: '#d946ef', performance: '#64748b',
};

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
    case 'year': return String(Math.round(v));
    case 'hours': return `${n(v)} h`;
    case 'km': return `${n(v)} km`;
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

// Build the de-duplicated, sorted bar list for one normalisation key.
function chartRows(metrics, key) {
  const cand = metrics.map((m) => ({ m, pu: perUnit(m)[key] })).filter((x) => x.pu > 0);
  // Prefer explicit per-unit metrics, then keep one bar per (deal, rounded value).
  cand.sort((a, b) => ((a.m.unit === '$/MW' || a.m.unit === '$/MWh') ? 0 : 1) - ((b.m.unit === '$/MW' || b.m.unit === '$/MWh') ? 0 : 1));
  const seen = new Set();
  const uniq = [];
  for (const x of cand) {
    const k = `${x.m.deal_id}|${Math.round(x.pu / 1000)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(x);
  }
  return uniq.sort((a, b) => b.pu - a.pu).slice(0, 14);
}

function BarList({ rows }) {
  if (!rows.length) return <div className="text-xs text-gray-400">No values in the current filter.</div>;
  const max = Math.max(...rows.map((r) => r.pu));
  return (
    <div>
      {rows.map((r) => (
        <div key={r.m.id} className="flex items-center gap-2 my-0.5 text-[11px]">
          <div className="w-44 shrink-0 truncate text-gray-600" title={`${r.m.deal_name} · ${metricLabel(r.m.metric)}`}>
            {r.m.deal_name} · {metricLabel(r.m.metric)}
          </div>
          <div className="flex-1 bg-gray-100 rounded h-4">
            <div className="h-4 rounded" style={{ width: `${Math.max(2, (r.pu / max) * 100)}%`, background: CAT_HEX[r.m.category] || '#64748b' }} />
          </div>
          <div className="w-16 text-right tabular-nums text-gray-700">{fmtMoneyPer(r.pu)}</div>
        </div>
      ))}
    </div>
  );
}

function CostCharts({ metrics }) {
  const mw = useMemo(() => chartRows(metrics, 'perMw'), [metrics]);
  const mwh = useMemo(() => chartRows(metrics, 'perMwh'), [metrics]);
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Cost comparison <span className="text-xs font-normal text-gray-400">(reflects filters)</span></h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div><div className="text-xs text-gray-400 mb-1.5">Per MW ($/MW)</div><BarList rows={mw} /></div>
        <div><div className="text-xs text-gray-400 mb-1.5">Per MWh ($/MWh)</div><BarList rows={mwh} /></div>
      </div>
      <div className="text-[11px] text-gray-400 mt-3">Includes $/MW &amp; $/MWh metrics plus totals (capex, debt, EV) normalised by capacity. Coloured by category.</div>
    </div>
  );
}

const EMPTY_DEAL = {
  name: '', counterparty: '', seller: '', technology: 'Solar', deal_type: 'M&A',
  state: 'NSW', capacity_mw: '', capacity_mwh: '', capacity_mwac: '',
  status: 'Announced', transaction_date: '', date_added: new Date().toISOString().slice(0, 10), data_class: 'Real', currency: 'AUD', scheme: '', program: '', source: '', source_url: '', confidence: 'Medium', notes: '',
};

export default function CompsPage() {
  const [deals, setDeals] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('deals'); // 'deals' | 'metrics' (within Data tab)
  const [tab, setTab] = useState('summary'); // 'summary' | 'data' | 'schema'
  const [showDealForm, setShowDealForm] = useState(false);
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [resyncing, setResyncing] = useState(false);

  // filters
  const [fTech, setFTech] = useState('');
  const [fState, setFState] = useState('');
  const [fCat, setFCat] = useState('');
  const [fType, setFType] = useState('');
  const [fScheme, setFScheme] = useState('');
  const [fClass, setFClass] = useState('');
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
    if (fScheme && m.scheme !== fScheme) return false;
    if (fClass && m.data_class !== fClass) return false;
    if (q) {
      const hay = `${m.deal_name} ${metricLabel(m.metric)} ${m.metric}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [metrics, fTech, fState, fCat, fType, fScheme, fClass, q]);

  const filteredDeals = useMemo(() => deals.filter((d) => {
    if (fTech && d.technology !== fTech) return false;
    if (fState && d.state !== fState) return false;
    if (fType && d.deal_type !== fType) return false;
    if (fScheme && d.scheme !== fScheme) return false;
    if (fClass && d.data_class !== fClass) return false;
    if (q && !d.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [deals, fTech, fState, fType, fScheme, fClass, q]);

  const schemesInData = useMemo(() => [...new Set(deals.map((d) => d.scheme).filter(Boolean))].sort(), [deals]);

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
  async function resync() {
    if (!confirm('Refresh from the curated dataset? This re-pulls every dataset deal (overwriting edits to those rows); your manually-added deals are kept.')) return;
    setResyncing(true);
    try {
      const res = await fetch('/api/comps/resync', { method: 'POST' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'failed');
      await load();
      alert(`Refreshed ${d.synced} deals from the dataset.`);
    } catch (e) {
      alert(`Refresh failed: ${e.message}`);
    } finally {
      setResyncing(false);
    }
  }

  const clearFilters = () => { setFTech(''); setFState(''); setFCat(''); setFType(''); setFScheme(''); setFClass(''); setQ(''); };
  const anyFilter = fTech || fState || fCat || fType || fScheme || fClass || q;
  const filterProps = {
    q, setQ, fCat, setFCat, fTech, setFTech, fState, setFState, fType, setFType,
    fScheme, setFScheme, fClass, setFClass, schemes: schemesInData, anyFilter, onClear: clearFilters,
  };

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
          <button onClick={resync} disabled={resyncing} title="Re-pull the curated dataset into the database" className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded hover:bg-gray-50 disabled:opacity-50">{resyncing ? 'Refreshing…' : '↻ Refresh data'}</button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-4">
        {[['summary', 'Summary'], ['data', 'Data'], ['schema', 'Schema']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn('px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors',
              tab === k ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800')}>
            {label}
          </button>
        ))}
      </div>

      {!loading && deals.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3 mb-4">
          No data loaded yet — click <span className="font-medium">↻ Refresh data</span> (top right) to pull the curated dataset into the database.
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : tab === 'summary' ? (
        <>
          <SummaryOverview deals={deals} metrics={metrics} stats={stats} />
          <h2 className="text-sm font-semibold text-gray-700 mb-2 mt-1">Cost comparison <span className="text-xs font-normal text-gray-400">(filterable)</span></h2>
          <FilterControls {...filterProps} right={<span className="ml-auto text-xs text-gray-400">{filteredMetrics.length} observations</span>} />
          <CostCharts metrics={filteredMetrics} />
        </>
      ) : tab === 'schema' ? (
        <SchemaReference />
      ) : (
        <>
          {/* View toggle + add buttons (same row) */}
          <div className="flex items-center gap-2 mb-3">
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
              {['deals', 'metrics'].map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className={cn('px-3 py-1.5 text-sm capitalize', view === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>
                  {v}
                </button>
              ))}
            </div>
            <button onClick={() => setShowMetricForm((v) => !v)} className="ml-auto px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">+ Metric</button>
            <button onClick={() => setShowDealForm((v) => !v)} className="px-3 py-1.5 bg-slate-700 text-white text-sm rounded hover:bg-slate-800">+ Deal</button>
          </div>
          {showDealForm && <DealForm onSubmit={addDeal} onCancel={() => setShowDealForm(false)} />}
          {showMetricForm && <MetricForm deals={deals} onSubmit={addMetric} onCancel={() => setShowMetricForm(false)} />}

          <FilterControls {...filterProps} right={<span className="ml-auto text-xs text-gray-400">{view === 'metrics' ? `${filteredMetrics.length} observations` : `${filteredDeals.length} deals`}</span>} />

          {view === 'metrics' ? (
            <MetricsView byCategory={byCategory} onDelete={delMetric} />
          ) : (
            <DealsView deals={filteredDeals} onDelete={delDeal} />
          )}
        </>
      )}
    </div>
  );
}

// ── Summary tab: stat cards + breakdown tables + cost charts ───────────────
function countBy(arr, fn) {
  const m = {};
  for (const x of arr) { const k = fn(x) || '—'; m[k] = (m[k] || 0) + 1; }
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

function BreakdownTable({ title, rows }) {
  const total = rows.reduce((s, [, v]) => s + v, 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2 text-sm font-semibold text-gray-700 border-b border-gray-200 bg-gray-50">{title}</div>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-100">
          {rows.map(([k, v]) => (
            <tr key={k} className="hover:bg-gray-50">
              <td className="px-4 py-1.5 text-gray-700">{k}</td>
              <td className="px-4 py-1.5 text-right tabular-nums text-gray-600 w-16">{v}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200 bg-gray-50 font-medium">
            <td className="px-4 py-1.5 text-gray-600">Total</td>
            <td className="px-4 py-1.5 text-right tabular-nums text-gray-700">{total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// Shared filter bar (used on Summary — above charts — and Data tab).
function FilterControls({ q, setQ, fCat, setFCat, fTech, setFTech, fState, setFState, fType, setFType, fScheme, setFScheme, fClass, setFClass, schemes, anyFilter, onClear, right }) {
  const sel = 'border border-gray-300 rounded px-2 py-1.5 text-sm';
  return (
    <div className="flex flex-wrap gap-2 mb-3 items-center">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search deal or metric…" className="border border-gray-300 rounded px-3 py-1.5 text-sm w-56" />
      <select value={fClass} onChange={(e) => setFClass(e.target.value)} className={sel}>
        <option value="">All classes</option>
        {DATA_CLASSES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <select value={fCat} onChange={(e) => setFCat(e.target.value)} className={sel}>
        <option value="">All categories</option>
        {COMP_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>
      <select value={fTech} onChange={(e) => setFTech(e.target.value)} className={sel}>
        <option value="">All tech</option>
        {TECHNOLOGIES.map((t) => <option key={t}>{t}</option>)}
      </select>
      <select value={fState} onChange={(e) => setFState(e.target.value)} className={sel}>
        <option value="">All states</option>
        {STATES.map((s) => <option key={s}>{s}</option>)}
      </select>
      <select value={fType} onChange={(e) => setFType(e.target.value)} className={sel}>
        <option value="">All deal types</option>
        {DEAL_TYPES.map((t) => <option key={t}>{t}</option>)}
      </select>
      {schemes.length > 0 && (
        <select value={fScheme} onChange={(e) => setFScheme(e.target.value)} className={sel}>
          <option value="">All schemes</option>
          {schemes.map((p) => <option key={p}>{p}</option>)}
        </select>
      )}
      {anyFilter && <button onClick={onClear} className="text-sm text-gray-500 hover:text-gray-800 underline">Clear</button>}
      {right}
    </div>
  );
}

function SummaryOverview({ deals, metrics, stats }) {
  const byType = useMemo(() => countBy(deals, (d) => d.deal_type), [deals]);
  const byCat = useMemo(() => countBy(metrics, (m) => CATEGORY_BY_KEY[m.category]?.label || m.category), [metrics]);
  const byScheme = useMemo(() => countBy(deals.filter((d) => d.scheme), (d) => d.scheme), [deals]);
  const byClass = useMemo(() => countBy(deals, (d) => d.data_class), [deals]);
  return (
    <div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <BreakdownTable title="Deals by class" rows={byClass} />
        <BreakdownTable title="Deals by type" rows={byType} />
        <BreakdownTable title="Metrics by category" rows={byCat} />
        <BreakdownTable title="Deals by scheme" rows={byScheme.length ? byScheme : [['(none tagged)', 0]]} />
      </div>
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
            <th className="text-left px-3 py-2 font-medium">Scheme / round</th>
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
                <div className="font-medium text-gray-800">
                  {d.name}
                  {d.data_class && <span className={cn('ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium align-middle', CLASS_COLORS[d.data_class] || '')}>{d.data_class}</span>}
                </div>
                {d.counterparty && d.counterparty !== '—' && <div className="text-[11px] text-gray-400">{d.counterparty}{d.seller && d.seller !== '—' ? ` ← ${d.seller}` : ''}</div>}
                {(d.source || d.source_url) && <div className="text-[11px] mt-0.5"><SourceLink source={d.source} url={d.source_url} /></div>}
              </td>
              <td className="px-3 py-2 text-gray-600">{d.deal_type || '—'}</td>
              <td className="px-3 py-2">
                {d.scheme ? <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">{d.scheme}</span> : <span className="text-gray-300">—</span>}
                {d.program && <div className="text-[10px] text-gray-400 mt-0.5">{d.program}</div>}
              </td>
              <td className="px-3 py-2 text-gray-600">{d.technology || '—'}</td>
              <td className="px-3 py-2 text-gray-600">{d.state || '—'}</td>
              <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{fmtCapacity(d)}</td>
              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                {d.transaction_date ? String(d.transaction_date).slice(0, 10) : '—'}
                {d.date_added && <div className="text-[10px] text-gray-400">added {String(d.date_added).slice(0, 10)}</div>}
              </td>
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
// Deal-level fields (comp_deals). `enum` references a controlled vocabulary.
const DEAL_FIELDS = [
  { f: 'name', desc: 'Deal / asset / transaction name (unique key for resync)', type: 'text' },
  { f: 'counterparty', desc: 'Buyer / developer / owner / offtaker', type: 'text' },
  { f: 'seller', desc: 'Vendor (M&A)', type: 'text' },
  { f: 'data_class', desc: 'Real deal/project vs Benchmark (GenCost, NSW guideline, reference data)', enum: DATA_CLASSES, hl: true },
  { f: 'technology', desc: 'Asset technology', enum: TECHNOLOGIES },
  { f: 'deal_type', desc: 'Nature of the deal', enum: DEAL_TYPES },
  { f: 'scheme', desc: 'Support-scheme GROUP (rolls awards up)', enum: SCHEMES, hl: true },
  { f: 'program', desc: 'Tender round within the scheme (free text)', enum: PROGRAMS, hl: true },
  { f: 'state', desc: 'Australian state / NEM region', enum: STATES },
  { f: 'capacity_mw', desc: 'Power capacity (drives $/MW)', type: 'numeric' },
  { f: 'capacity_mwh', desc: 'Energy capacity (drives $/MWh)', type: 'numeric' },
  { f: 'capacity_mwac', desc: 'AC capacity (solar — the standard rating)', type: 'numeric' },
  { f: 'status', desc: 'Lifecycle stage', enum: STATUSES },
  { f: 'transaction_date', desc: 'Announced / completed date of the deal', type: 'date' },
  { f: 'date_added', desc: 'Provenance: when added to the dataset (stable across resyncs)', type: 'date', hl: true },
  { f: 'currency', desc: 'Reporting currency', type: 'text (AUD)' },
  { f: 'source / source_url', desc: 'Publisher + clickable reference', type: 'text + url' },
  { f: 'confidence', desc: 'Data quality flag', enum: CONFIDENCE },
  { f: 'notes', desc: 'Context, caveats', type: 'text' },
];

function Chips({ items }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((x) => <span key={x} className="px-1.5 py-0.5 rounded bg-white border border-gray-200 text-[11px] text-gray-600">{x}</span>)}
    </div>
  );
}

function SchemaReference() {
  return (
    <div className="space-y-4">
      <div className="bg-slate-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600">
        Tall (entity–attribute–value) model: one <code className="bg-white px-1 rounded border">comp_deals</code> row
        per deal/asset/transaction, and one <code className="bg-white px-1 rounded border">comp_metrics</code> row
        per observed stat — <code className="bg-white px-1 rounded border">deal → category → metric → value + unit + basis</code>.
        New comp types are just new taxonomy entries — no migration. Source of truth: <code className="bg-white px-1 rounded border">lib/compsTaxonomy.js</code>.
      </div>

      {/* Deal fields */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-2 text-sm font-semibold text-gray-700 border-b border-gray-200 bg-gray-50">Deal fields <span className="font-normal text-gray-400">(comp_deals)</span></div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {DEAL_FIELDS.map((r) => (
              <tr key={r.f} className={cn('hover:bg-gray-50', r.hl && 'bg-blue-50/40')}>
                <td className="px-4 py-1.5 font-mono text-[12px] text-gray-800 whitespace-nowrap align-top">
                  {r.f}{r.hl && <span className="ml-1.5 text-[9px] font-sans uppercase tracking-wide text-blue-600">scheme ext.</span>}
                </td>
                <td className="px-4 py-1.5 text-gray-600 align-top">{r.desc}</td>
                <td className="px-4 py-1.5 align-top">{r.enum ? <Chips items={r.enum} /> : <span className="text-[11px] text-gray-400">{r.type}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 text-[11px] text-gray-400 border-t border-gray-100">
          <b>scheme</b> is the high-level grouping (CISA, NSW LTESA, SA FERM, …) — distinct from the metric <i>categories</i> below;
          <b> program</b> is the specific tender round. Both are deal-level, so a single award carries scheme + program + its metrics.
        </div>
      </div>

      {/* Metric taxonomy */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm font-semibold text-gray-700 mb-3">Metric taxonomy <span className="font-normal text-gray-400">(comp_metrics — category → metric · default unit)</span></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {COMP_CATEGORIES.map((c) => (
            <div key={c.key} className="border border-gray-200 rounded p-3">
              <div className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium border mb-2', c.color)}>{c.label}
                <span className="ml-1.5 font-normal opacity-60">{c.metrics.length}</span>
              </div>
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

      {/* Controlled vocabularies */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm font-semibold text-gray-700 mb-3">Controlled vocabularies</div>
        <div className="space-y-2.5">
          {[
            ['Classes', DATA_CLASSES], ['Schemes', SCHEMES], ['Programs', PROGRAMS], ['Technologies', TECHNOLOGIES],
            ['Deal types', DEAL_TYPES], ['States', STATES], ['Statuses', STATUSES],
            ['Confidence', CONFIDENCE], ['Units', UNITS], ['Bases', BASES],
          ].map(([label, items]) => (
            <div key={label} className="grid grid-cols-[110px_1fr] gap-2 items-start">
              <div className="text-xs font-medium text-gray-500 pt-0.5">{label}</div>
              <Chips items={items} />
            </div>
          ))}
        </div>
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
      <Field label="Class"><select value={f.data_class} onChange={set('data_class')} className="inp">{DATA_CLASSES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Scheme">
        <input list="comps-schemes" value={f.scheme} onChange={set('scheme')} className="inp" placeholder="e.g. CISA, NSW LTESA, SA FERM" />
        <datalist id="comps-schemes">{SCHEMES.map((s) => <option key={s} value={s} />)}</datalist>
      </Field>
      <Field label="Program / round">
        <input list="comps-programs" value={f.program} onChange={set('program')} className="inp" placeholder="e.g. CIS Tender 3 — NEM Dispatchable" />
        <datalist id="comps-programs">{PROGRAMS.map((p) => <option key={p} value={p} />)}</datalist>
      </Field>
      <Field label="Technology"><select value={f.technology} onChange={set('technology')} className="inp">{TECHNOLOGIES.map((t) => <option key={t}>{t}</option>)}</select></Field>
      <Field label="State"><select value={f.state} onChange={set('state')} className="inp">{STATES.map((s) => <option key={s}>{s}</option>)}</select></Field>
      <Field label="Status"><select value={f.status} onChange={set('status')} className="inp">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
      <Field label="Transaction date"><input type="date" value={f.transaction_date} onChange={set('transaction_date')} className="inp" /></Field>
      <Field label="Date added"><input type="date" value={f.date_added} onChange={set('date_added')} className="inp" /></Field>
      <Field label="Capacity MW"><input type="number" step="any" value={f.capacity_mw} onChange={set('capacity_mw')} className="inp" /></Field>
      <Field label="Capacity MWh"><input type="number" step="any" value={f.capacity_mwh} onChange={set('capacity_mwh')} className="inp" /></Field>
      <Field label="MWac"><input type="number" step="any" value={f.capacity_mwac} onChange={set('capacity_mwac')} className="inp" /></Field>
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
