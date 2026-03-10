'use client';

import { useState, useEffect } from 'react';
import { vintageLabel, vintageSortKey } from '../../../lib/vintageLabel';
import { exportCSV, ExportButton } from '../../../lib/exportCsv';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATION_ORDER = ['1h', '2h', '4h', '8h', '12h'];

const DURATION_COLORS = {
  '1h':  '#3b82f6',
  '2h':  '#10b981',
  '4h':  '#f59e0b',
  '8h':  '#ef4444',
  '12h': '#8b5cf6',
};

const CF_COLORS = {
  energy_trading_cf: '#3b82f6',
  high_price_cf:     '#f59e0b',
  fcas_cf:           '#10b981',
  wholesale_charge_cf: '#ef4444',
};

const CF_LABELS = {
  energy_trading_cf:  'Energy Trading',
  high_price_cf:      'High Price / Cap',
  fcas_cf:            'FCAS',
  wholesale_charge_cf: 'Charge Cost',
};

const TABS = ['Compare', 'Annual Cashflow', 'Revenue Breakdown', 'Duration Comparison', 'Volume', 'Cap Values', 'Event Payouts'];

const SCENARIO_LABELS = {
  base:                 'Base',
  ea:                   'EA',
  ea_fcas:              'EA + FCAS',
  no_degradation:       'No Degradation',
  no_fcas_degradation:  'No FCAS Degrad.',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtK(v) {
  if (v == null) return '—';
  const n = parseFloat(v);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

function fmtDollar(v) {
  if (v == null) return '—';
  return `$${Number(v).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;
}

function LoadingSpinner() {
  return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading data...</div>;
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

// Keys in cascade order — changing one resets all keys after it
const CASCADE_ORDER = ['vintage', 'region', 'duration', 'scenario', 'startYear', 'degraded'];

function FilterBar({ filters, sel, setSel, hideVintage }) {
  if (!filters) return null;
  const { vintages, regions, durations, scenarios, startYears, degradedOptions } = filters;

  const handleChange = (key, value) => {
    const idx = CASCADE_ORDER.indexOf(key);
    setSel((s) => {
      const next = { ...s, [key]: value };
      // Clear downstream fields so the cascade useEffect will reset them to valid first options
      CASCADE_ORDER.slice(idx + 1).forEach((k) => { next[k] = ''; });
      return next;
    });
  };

  const field = (label, key, opts, labelMap) => (
    <div>
      <label className="text-xs text-gray-500 font-medium block mb-1">{label}</label>
      <select
        className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
        value={sel[key]}
        onChange={(e) => handleChange(key, e.target.value)}
      >
        {opts.map((o) => <option key={o} value={o}>{labelMap ? (labelMap[o] || o) : o}</option>)}
      </select>
    </div>
  );

  const showDegradation = !degradedOptions || degradedOptions.length > 1;

  return (
    <div className="flex flex-wrap gap-3 mb-5 p-3 bg-gray-50 rounded-lg border border-gray-200">
      {!hideVintage && field('Vintage', 'vintage', vintages, Object.fromEntries(vintages.map((v) => [v, vintageLabel(v)])))}
      {field('Region', 'region', regions)}
      {field('Duration', 'duration', DURATION_ORDER.filter((d) => durations.includes(d)))}
      {field('Scenario', 'scenario', scenarios, SCENARIO_LABELS)}
      {field('Start Year', 'startYear', startYears.map(String))}
      {showDegradation && (
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Degradation</label>
          <select
            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
            value={sel.degraded}
            onChange={(e) => handleChange('degraded', e.target.value)}
          >
            {degradedOptions?.includes(true) && <option value="true">With Degradation</option>}
            {degradedOptions?.includes(false) && <option value="false">No Degradation</option>}
            {!degradedOptions && <>
              <option value="true">With Degradation</option>
              <option value="false">No Degradation</option>
            </>}
          </select>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Annual Cashflow ─────────────────────────────────────────────────────

function CashflowTab({ sel }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    const p = new URLSearchParams({
      type: 'cashflow', vintage: sel.vintage, region: sel.region,
      duration: sel.duration, scenario: sel.scenario,
      start_year: sel.startYear, degraded: sel.degraded,
    });
    fetch(`/api/bess-cases?${p}`).then((r) => r.json()).then((d) => setData(d.cashflow || []));
  }, [sel]);

  if (!data) return <LoadingSpinner />;
  if (data.length === 0) return <div className="text-center text-gray-400 py-12 text-sm">No data for this combination.</div>;

  const chartData = data.map((r) => ({
    year: r.fy_year,
    'Total Cashflow': parseFloat(r.total_cf),
    'Energy Trading': parseFloat(r.energy_trading_cf),
    'High Price/Cap': parseFloat(r.high_price_cf),
    'FCAS': parseFloat(r.fcas_cf),
  }));

  const totalAvg = data.reduce((s, r) => s + parseFloat(r.total_cf || 0), 0) / data.length;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard label="Avg Annual Cashflow" value={fmtK(totalAvg)} color="blue" />
        <StatCard label="Peak Cashflow" value={fmtK(Math.max(...data.map((r) => parseFloat(r.total_cf || 0))))} color="green" />
        <StatCard label="Years of Data" value={data.length} color="gray" />
      </div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Annual Total Cashflow (A$/year)</h3>
        <ExportButton onClick={() => exportCSV(data.map(r => ({ year: r.fy_year, energy_trading_cf: r.energy_trading_cf, high_price_cf: r.high_price_cf, fcas_cf: r.fcas_cf, wholesale_charge_cf: r.wholesale_charge_cf, total_cf: r.total_cf })), `bess-cashflow-${sel.vintage}-${sel.region}-${sel.duration}`)} />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtK} />
          <Tooltip formatter={(v, name) => [fmtDollar(v), name]} />
          <ReferenceLine y={0} stroke="#9ca3af" />
          <Line type="monotone" dataKey="Total Cashflow" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="Energy Trading" stroke="#6b7280" strokeWidth={1} dot={false} strokeDasharray="4 2" />
          <Line type="monotone" dataKey="High Price/Cap" stroke="#f59e0b" strokeWidth={1} dot={false} strokeDasharray="4 2" />
          <Line type="monotone" dataKey="FCAS" stroke="#10b981" strokeWidth={1} dot={false} strokeDasharray="4 2" />
          <Legend />
        </LineChart>
      </ResponsiveContainer>

      {/* Data table */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {['Year','Energy Trading','High Price/Cap','FCAS','Charge Cost','Total CF'].map((h) => (
                <th key={h} className="px-3 py-2 border border-gray-200 font-semibold text-gray-600 text-right first:text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.fy_year} className="hover:bg-gray-50">
                <td className="px-3 py-1.5 border border-gray-200 font-medium">{r.fy_year}</td>
                <td className="px-3 py-1.5 border border-gray-200 text-right">{fmtDollar(r.energy_trading_cf)}</td>
                <td className="px-3 py-1.5 border border-gray-200 text-right">{fmtDollar(r.high_price_cf)}</td>
                <td className="px-3 py-1.5 border border-gray-200 text-right">{fmtDollar(r.fcas_cf)}</td>
                <td className="px-3 py-1.5 border border-gray-200 text-right text-red-600">{fmtDollar(r.wholesale_charge_cf)}</td>
                <td className="px-3 py-1.5 border border-gray-200 text-right font-semibold text-blue-700">{fmtDollar(r.total_cf)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Revenue Breakdown ───────────────────────────────────────────────────

function RevenueTab({ sel }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    const p = new URLSearchParams({
      type: 'cashflow', vintage: sel.vintage, region: sel.region,
      duration: sel.duration, scenario: sel.scenario,
      start_year: sel.startYear, degraded: sel.degraded,
    });
    fetch(`/api/bess-cases?${p}`).then((r) => r.json()).then((d) => setData(d.cashflow || []));
  }, [sel]);

  if (!data) return <LoadingSpinner />;
  if (data.length === 0) return <div className="text-center text-gray-400 py-12 text-sm">No data for this combination.</div>;

  const chartData = data.map((r) => ({
    year: r.fy_year,
    'Energy Trading':  parseFloat(r.energy_trading_cf || 0),
    'High Price/Cap':  parseFloat(r.high_price_cf || 0),
    'FCAS':            parseFloat(r.fcas_cf || 0),
    'Charge Cost':     parseFloat(r.wholesale_charge_cf || 0),
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Revenue Component Breakdown (A$/year)</h3>
        <ExportButton onClick={() => exportCSV(chartData, `bess-revenue-${sel.vintage}-${sel.region}-${sel.duration}`)} />
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtK} />
          <Tooltip formatter={(v, name) => [fmtDollar(v), name]} />
          <ReferenceLine y={0} stroke="#374151" />
          <Legend />
          <Bar dataKey="Energy Trading" stackId="a" fill="#3b82f6" />
          <Bar dataKey="High Price/Cap" stackId="a" fill="#f59e0b" />
          <Bar dataKey="FCAS" stackId="a" fill="#10b981" />
          <Bar dataKey="Charge Cost" stackId="a" fill="#ef4444" radius={[0, 0, 3, 3]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Tab: Duration Comparison ─────────────────────────────────────────────────

function DurationTab({ sel }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    const p = new URLSearchParams({
      type: 'compare_durations', vintage: sel.vintage, region: sel.region,
      scenario: sel.scenario, start_year: sel.startYear, degraded: sel.degraded,
    });
    fetch(`/api/bess-cases?${p}`).then((r) => r.json()).then((d) => setData(d.compare || []));
  }, [sel]);

  if (!data) return <LoadingSpinner />;
  if (data.length === 0) return <div className="text-center text-gray-400 py-12 text-sm">No data for this combination.</div>;

  const years = [...new Set(data.map((r) => r.fy_year))].sort();
  const durations = [...new Set(data.map((r) => r.duration))].sort((a, b) => DURATION_ORDER.indexOf(a) - DURATION_ORDER.indexOf(b));

  const chartData = years.map((year) => {
    const point = { year };
    for (const dur of durations) {
      const row = data.find((r) => r.fy_year === year && r.duration === dur);
      point[dur] = row?.total_cf != null ? parseFloat(row.total_cf) : null;
    }
    return point;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Total Cashflow by Duration — {sel.region} ({SCENARIO_LABELS[sel.scenario] || sel.scenario})</h3>
        <ExportButton onClick={() => exportCSV(chartData, `bess-duration-compare-${sel.vintage}-${sel.region}`)} />
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtK} />
          <Tooltip formatter={(v, name) => [fmtDollar(v), name]} />
          <ReferenceLine y={0} stroke="#9ca3af" />
          <Legend />
          {durations.map((dur) => (
            <Line key={dur} type="monotone" dataKey={dur} stroke={DURATION_COLORS[dur] || '#6b7280'} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 border border-gray-200 font-semibold text-gray-600 text-left">Year</th>
              {durations.map((d) => (
                <th key={d} className="px-3 py-2 border border-gray-200 font-semibold text-right" style={{ color: DURATION_COLORS[d] }}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chartData.map((r) => (
              <tr key={r.year} className="hover:bg-gray-50">
                <td className="px-3 py-1.5 border border-gray-200 font-medium">{r.year}</td>
                {durations.map((d) => (
                  <td key={d} className="px-3 py-1.5 border border-gray-200 text-right">{fmtDollar(r[d])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Volume ──────────────────────────────────────────────────────────────

function VolumeTab({ sel }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    const p = new URLSearchParams({
      type: 'volume', vintage: sel.vintage, region: sel.region,
      duration: sel.duration, scenario: sel.scenario,
      start_year: sel.startYear, degraded: sel.degraded,
    });
    fetch(`/api/bess-cases?${p}`).then((r) => r.json()).then((d) => setData(d.volume || []));
  }, [sel]);

  if (!data) return <LoadingSpinner />;
  if (data.length === 0) return <div className="text-center text-gray-400 py-12 text-sm">No data for this combination.</div>;

  const chartData = data.map((r) => ({
    year: r.fy_year,
    Discharge: parseFloat(r.discharge_vol || 0),
    Charge: parseFloat(r.charge_vol || 0),
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Discharge / Charge Volume (MWh/day)</h3>
        <ExportButton onClick={() => exportCSV(data.map(r => ({ year: r.fy_year, discharge_vol: r.discharge_vol, charge_vol: r.charge_vol })), `bess-volume-${sel.vintage}-${sel.region}-${sel.duration}`)} />
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v, name) => [`${Number(v).toFixed(1)} MWh/day`, name]} />
          <ReferenceLine y={0} stroke="#374151" />
          <Legend />
          <Bar dataKey="Discharge" fill="#3b82f6" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Charge" fill="#ef4444" radius={[0, 0, 3, 3]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Tab: Cap Values ──────────────────────────────────────────────────────────

function CapValuesTab({ sel }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    const p = new URLSearchParams({ type: 'cap_values', vintage: sel.vintage, region: sel.region });
    fetch(`/api/bess-cases?${p}`).then((r) => r.json()).then((d) => setData(d.cap_values || []));
  }, [sel.vintage, sel.region]);

  if (!data) return <LoadingSpinner />;

  const chartData = data.map((r) => ({ year: r.fy_year, value: parseFloat(r.value || 0) }));

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Cap Market Value (A$/MWh) — {sel.region}</h3>
        <ExportButton onClick={() => exportCSV(chartData, `bess-cap-values-${sel.vintage}-${sel.region}`)} />
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toFixed(1)}`} />
          <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}/MWh`, 'Cap Value']} />
          <Bar dataKey="value" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="Cap Value" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 border border-gray-200 font-semibold text-gray-600 text-left">Year</th>
              <th className="px-3 py-2 border border-gray-200 font-semibold text-gray-600 text-right">Cap Value ($/MWh)</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((r) => (
              <tr key={r.year} className="hover:bg-gray-50">
                <td className="px-3 py-1.5 border border-gray-200 font-medium">{r.year}</td>
                <td className="px-3 py-1.5 border border-gray-200 text-right">${Number(r.value).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Event Payouts ───────────────────────────────────────────────────────

function EventPayoutsTab({ sel }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    const p = new URLSearchParams({ type: 'event_payouts', vintage: sel.vintage });
    fetch(`/api/bess-cases?${p}`).then((r) => r.json()).then((d) => setData(d.event_payouts || []));
  }, [sel.vintage]);

  if (!data) return <LoadingSpinner />;

  const durations = [...new Set(data.map((r) => r.duration))].sort((a, b) => DURATION_ORDER.indexOf(a) - DURATION_ORDER.indexOf(b));
  const major = data.filter((r) => r.event_type === 'major');
  const minor = data.filter((r) => r.event_type === 'minor');

  const tableSection = (title, rows) => (
    <div className="mb-5">
      <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">{title}</h4>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-3 py-2 border border-gray-200 font-semibold text-gray-600 text-left">Duration</th>
            <th className="px-3 py-2 border border-gray-200 font-semibold text-gray-600 text-right">Value (A$)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.duration} className="hover:bg-gray-50">
              <td className="px-3 py-1.5 border border-gray-200 font-medium">{r.duration}</td>
              <td className="px-3 py-1.5 border border-gray-200 text-right font-semibold">{fmtDollar(r.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const chartData = durations.map((dur) => ({
    duration: dur,
    Major: parseFloat(data.find((r) => r.duration === dur && r.event_type === 'major')?.value || 0),
    Minor: parseFloat(data.find((r) => r.duration === dur && r.event_type === 'minor')?.value || 0),
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Event Payouts by Duration — {vintageLabel(sel.vintage)}</h3>
        <ExportButton onClick={() => exportCSV(data, `bess-event-payouts-${sel.vintage}`)} />
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="duration" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtK} />
          <Tooltip formatter={(v, name) => [fmtDollar(v), name + ' Event']} />
          <Legend />
          <Bar dataKey="Major" fill="#ef4444" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Minor" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-4 mt-4">
        {tableSection('Major Events', major)}
        {tableSection('Minor Events', minor)}
      </div>
    </div>
  );
}

// ─── Shared stat card ─────────────────────────────────────────────────────────

function StatCard({ label, value, color = 'blue' }) {
  const colors = {
    blue:  'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    gray:  'bg-gray-50 border-gray-200 text-gray-700',
  };
  return (
    <div className={`border rounded-lg p-3 ${colors[color]}`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-0.5">{label}</div>
    </div>
  );
}

// ─── Tab: Compare Vintages ────────────────────────────────────────────────────

const BESS_COMPARE_COLORS = [
  '#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#06b6d4','#f97316','#84cc16',
];

function BESSCompareTab({ sel, allVintages }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    const p = new URLSearchParams({
      type: 'compare_vintages',
      region: sel.region, duration: sel.duration,
      scenario: sel.scenario, start_year: sel.startYear, degraded: sel.degraded,
    });
    fetch(`/api/bess-cases?${p}`).then((r) => r.json()).then((d) => setData(d.compare || []));
  }, [sel.region, sel.duration, sel.scenario, sel.startYear, sel.degraded]);

  if (!data) return <LoadingSpinner />;
  if (data.length === 0) return <div className="text-center text-gray-400 py-12 text-sm">No data for this combination.</div>;

  const sortedVintages = [...new Set(data.map((r) => r.vintage))]
    .sort((a, b) => vintageLabel(a).localeCompare(vintageLabel(b)));
  const years = [...new Set(data.map((r) => r.fy_year))].sort();

  const chartData = years.map((year) => {
    const point = { year };
    for (const v of sortedVintages) {
      const row = data.find((r) => r.fy_year === year && r.vintage === v);
      point[v] = row?.total_cf != null ? parseFloat(row.total_cf) : null;
    }
    return point;
  });

  return (
    <div>
      <div className="flex justify-between items-start mb-1">
        <h3 className="text-sm font-semibold text-gray-700">
          Total Annual Cashflow by Vintage — {sel.region} {sel.duration} ({SCENARIO_LABELS[sel.scenario] || sel.scenario})
        </h3>
        <ExportButton onClick={() => exportCSV(chartData, `bess-compare-vintages-${sel.region}-${sel.duration}`)} />
      </div>
      <p className="text-xs text-gray-400 mb-3">Shows how the cashflow forecast has changed across successive vintages</p>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtK} />
          <Tooltip formatter={(v, name) => [fmtDollar(v), vintageLabel(name)]} labelStyle={{ fontWeight: 600 }} />
          <ReferenceLine y={0} stroke="#9ca3af" />
          <Legend formatter={(name) => vintageLabel(name)} />
          {sortedVintages.map((v, i) => (
            <Line key={v} type="monotone" dataKey={v}
              stroke={BESS_COMPARE_COLORS[i % BESS_COMPARE_COLORS.length]}
              strokeWidth={2} dot={false} connectNulls={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BESSCasesPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState(null);
  const [sel, setSel] = useState({
    vintage: '', region: 'NSW', duration: '1h',
    scenario: 'base', startYear: '2025', degraded: 'true',
  });

  // On initial load, fetch all vintages then set latest
  useEffect(() => {
    fetch('/api/bess-cases?type=filters')
      .then((r) => r.json())
      .then((f) => {
        setFilters(f);
        setSel((s) => ({ ...s, vintage: f.vintages?.at(-1) || '' }));
      });
  }, []);

  // Cascade: re-fetch scoped options whenever any upstream filter changes
  // Cascade order: vintage → region → duration → scenario → startYear → degraded
  useEffect(() => {
    if (!sel.vintage) return;
    const p = new URLSearchParams({ type: 'filters', vintage: sel.vintage });
    if (sel.region)    p.set('region',     sel.region);
    if (sel.duration)  p.set('duration',   sel.duration);
    if (sel.scenario)  p.set('scenario',   sel.scenario);
    if (sel.startYear) p.set('start_year', sel.startYear);

    fetch(`/api/bess-cases?${p}`)
      .then((r) => r.json())
      .then((f) => {
        setFilters(f);
        // Reset each filter to first valid option if current value is no longer available
        setSel((s) => ({
          ...s,
          region:    f.regions?.includes(s.region)             ? s.region    : (f.regions?.[0]    ?? s.region),
          duration:  f.durations?.includes(s.duration)          ? s.duration  : (f.durations?.[0]  ?? s.duration),
          scenario:  f.scenarios?.includes(s.scenario)          ? s.scenario  : (f.scenarios?.[0]  ?? s.scenario),
          startYear: f.startYears?.map(String).includes(s.startYear) ? s.startYear : (f.startYears?.[0]?.toString() ?? s.startYear),
          degraded:  f.degradedOptions?.some((d) => String(d) === s.degraded) ? s.degraded : (f.degradedOptions?.[0] != null ? String(f.degradedOptions[0]) : s.degraded),
        }));
      });
  }, [sel.vintage, sel.region, sel.duration, sel.scenario, sel.startYear]);

  const ready = filters && sel.vintage;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">BESS Investment Cases</h1>
        <p className="text-sm text-gray-500 mt-0.5">Battery energy storage cashflow & revenue analysis by vintage, region, and duration</p>
      </div>

      <FilterBar filters={filters} sel={sel} setSel={setSel} hideVintage={activeTab === 0} />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-5 overflow-x-auto">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === i ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        {!ready ? (
          <LoadingSpinner />
        ) : (
          <>
            {activeTab === 0 && <BESSCompareTab sel={sel} allVintages={filters?.vintages || []} />}
            {activeTab === 1 && <CashflowTab sel={sel} />}
            {activeTab === 2 && <RevenueTab sel={sel} />}
            {activeTab === 3 && <DurationTab sel={sel} />}
            {activeTab === 4 && <VolumeTab sel={sel} />}
            {activeTab === 5 && <CapValuesTab sel={sel} />}
            {activeTab === 6 && <EventPayoutsTab sel={sel} />}
          </>
        )}
      </div>
    </div>
  );
}
