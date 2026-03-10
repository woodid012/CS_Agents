'use client';

import { useState, useEffect, useCallback } from 'react';
import { vintageLabel } from '../../../lib/vintageLabel';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';

// ─── Constants ────────────────────────────────────────────────────────────────

const REGIONS = ['NSW', 'QLD', 'SA', 'VIC', 'TAS'];

const CURVE_LABELS = {
  energy_twa_monthly: 'Energy (TWA)',
  solar_dwa_monthly: 'Solar DWA',
  wind_dwa_monthly: 'Wind DWA',
  solar_dwa_monthly_post_curt_0: 'Solar Post-Curt (0)',
  wind_dwa_monthly_post_curt_0: 'Wind Post-Curt (0)',
  solar_dwa_monthly_post_curt_lgc: 'Solar Post-Curt (+LGC)',
  wind_dwa_monthly_post_curt_lgc: 'Wind Post-Curt (+LGC)',
};

const DURATION_COLORS = {
  'Half-hourly': '#3b82f6',
  '1hr': '#10b981',
  '2hr': '#f59e0b',
  '4hr': '#ef4444',
};

const LINE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16',
];

const TABS = ['Energy Prices', 'Renewable Capture', 'Price Spreads', 'LGC Prices', 'Compare'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v) {
  if (v == null) return '—';
  return `$${Number(v).toFixed(2)}`;
}

function fmtDate(d) {
  if (!d) return d;
  const [y, m] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

// Aggregate monthly data to yearly averages for a cleaner chart
function toYearlyAvg(rows) {
  const byYear = {};
  for (const r of rows) {
    const year = r.date.split('-')[0];
    if (!byYear[year]) byYear[year] = { sum: 0, count: 0 };
    if (r.value != null) {
      byYear[year].sum += parseFloat(r.value);
      byYear[year].count++;
    }
  }
  return Object.entries(byYear)
    .map(([year, { sum, count }]) => ({ year, value: count > 0 ? sum / count : null }))
    .sort((a, b) => a.year.localeCompare(b.year));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterBar({ vintages, vintage, setVintage, region, setRegion }) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <div>
        <label className="text-xs text-gray-500 font-medium block mb-1">Vintage</label>
        <select
          className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
          value={vintage}
          onChange={(e) => setVintage(e.target.value)}
        >
          {vintages.map((v) => (
            <option key={v} value={v}>{vintageLabel(v)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500 font-medium block mb-1">Region</label>
        <select
          className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        >
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
      Loading data...
    </div>
  );
}

// ─── Tab: Energy Prices ───────────────────────────────────────────────────────

function EnergyTab({ vintage, region }) {
  const [data, setData] = useState(null);
  const [view, setView] = useState('monthly'); // monthly | yearly

  useEffect(() => {
    if (!vintage) return;
    setData(null);
    fetch(`/api/price-curves?type=monthly&vintage=${encodeURIComponent(vintage)}&region=${region}&curve_type=energy_twa_monthly`)
      .then((r) => r.json())
      .then((d) => setData(d.energy_twa_monthly || []));
  }, [vintage, region]);

  if (!data) return <LoadingSpinner />;

  const chartData = view === 'monthly'
    ? data.map((r) => ({ date: fmtDate(r.date), value: r.value != null ? parseFloat(r.value) : null }))
    : toYearlyAvg(data).map((r) => ({ date: r.year, value: r.value != null ? parseFloat(r.value).toFixed(2) : null }));

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Energy Time-Weighted Average Price — {region}</h3>
        <div className="flex gap-1">
          {['monthly', 'yearly'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2 py-1 text-xs rounded border ${view === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            interval={view === 'monthly' ? 11 : 0}
            angle={-30}
            textAnchor="end"
            height={50}
          />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Energy TWA']} />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} strokeWidth={2} name="Energy TWA ($/MWh)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Tab: Renewable Capture ───────────────────────────────────────────────────

const CAPTURE_CURVES = [
  'solar_dwa_monthly',
  'wind_dwa_monthly',
  'solar_dwa_monthly_post_curt_lgc',
  'wind_dwa_monthly_post_curt_lgc',
];

function CaptureTab({ vintage, region }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(['solar_dwa_monthly', 'wind_dwa_monthly']);

  useEffect(() => {
    if (!vintage) return;
    setData(null);
    fetch(`/api/price-curves?type=monthly&vintage=${encodeURIComponent(vintage)}&region=${region}&curve_type=${CAPTURE_CURVES.join(',')}`)
      .then((r) => r.json())
      .then(setData);
  }, [vintage, region]);

  if (!data) return <LoadingSpinner />;

  // Build chart data aligned by date
  const allDates = (data[CAPTURE_CURVES[0]] || []).map((r) => r.date);
  const chartData = allDates.map((date, i) => {
    const point = { date: fmtDate(date) };
    for (const ct of selected) {
      const row = (data[ct] || [])[i];
      point[ct] = row?.value != null ? parseFloat(row.value) : null;
    }
    return point;
  });

  // Sample every 3 months for readability
  const sampled = chartData.filter((_, i) => i % 3 === 0);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {CAPTURE_CURVES.map((ct) => (
          <button
            key={ct}
            onClick={() =>
              setSelected((prev) =>
                prev.includes(ct) ? prev.filter((x) => x !== ct) : [...prev, ct]
              )
            }
            className={`px-2 py-1 text-xs rounded border ${selected.includes(ct) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}
          >
            {CURVE_LABELS[ct]}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={sampled}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(v, name) => [`$${Number(v).toFixed(2)}`, CURVE_LABELS[name] || name]} />
          <Legend formatter={(name) => CURVE_LABELS[name] || name} />
          {selected.map((ct, i) => (
            <Line key={ct} type="monotone" dataKey={ct} stroke={LINE_COLORS[i % LINE_COLORS.length]} dot={false} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Tab: Price Spreads ───────────────────────────────────────────────────────

function SpreadsTab({ vintage, region }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!vintage) return;
    setData(null);
    fetch(`/api/price-curves?type=spreads&vintage=${encodeURIComponent(vintage)}&region=${region}`)
      .then((r) => r.json())
      .then((d) => setData(d.spreads || []));
  }, [vintage, region]);

  if (!data) return <LoadingSpinner />;

  // Pivot: { year -> { duration -> value } }
  const durations = [...new Set(data.map((r) => r.duration))];
  const years = [...new Set(data.map((r) => r.year))].sort();
  const chartData = years.map((year) => {
    const point = { year };
    for (const dur of durations) {
      const row = data.find((r) => r.year === year && r.duration === dur);
      point[dur] = row?.value != null ? parseFloat(row.value) : null;
    }
    return point;
  });

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Storage Price Spreads by Duration — {region}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name]} />
          <Legend />
          {durations.map((dur) => (
            <Line key={dur} type="monotone" dataKey={dur} stroke={DURATION_COLORS[dur] || '#6b7280'} dot={false} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-600">Year</th>
              {durations.map((d) => (
                <th key={d} className="text-right px-3 py-2 border border-gray-200 font-semibold text-gray-600">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chartData.map((row) => (
              <tr key={row.year} className="hover:bg-gray-50">
                <td className="px-3 py-1.5 border border-gray-200 font-medium">{row.year}</td>
                {durations.map((d) => (
                  <td key={d} className="px-3 py-1.5 border border-gray-200 text-right">{fmt(row[d])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: LGC Prices ─────────────────────────────────────────────────────────

function LGCTab({ vintage }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!vintage) return;
    setData(null);
    fetch(`/api/price-curves?type=lgc&vintage=${encodeURIComponent(vintage)}`)
      .then((r) => r.json())
      .then((d) => setData(d.lgc || []));
  }, [vintage]);

  if (!data) return <LoadingSpinner />;

  const chartData = data.map((r) => ({ year: r.year, value: r.value != null ? parseFloat(r.value) : null }));

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">LGC Price Forecast ($/MWh)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'LGC Price']} />
          <Bar dataKey="value" fill="#10b981" name="LGC $/MWh" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-600">Year</th>
              <th className="text-right px-3 py-2 border border-gray-200 font-semibold text-gray-600">LGC Price ($/MWh)</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((r) => (
              <tr key={r.year} className="hover:bg-gray-50">
                <td className="px-3 py-1.5 border border-gray-200 font-medium">{r.year}</td>
                <td className="px-3 py-1.5 border border-gray-200 text-right">{fmt(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Compare Vintages ────────────────────────────────────────────────────

const COMPARE_CURVES = [
  { value: 'energy_twa_monthly',           label: 'Energy (TWA)' },
  { value: 'solar_dwa_monthly',            label: 'Solar DWA' },
  { value: 'wind_dwa_monthly',             label: 'Wind DWA' },
  { value: 'solar_dwa_monthly_post_curt_lgc', label: 'Solar Post-Curt (+LGC)' },
  { value: 'wind_dwa_monthly_post_curt_lgc',  label: 'Wind Post-Curt (+LGC)' },
];

const AGGS = [
  { value: 'M',  label: 'Monthly' },
  { value: 'Q',  label: 'Quarterly' },
  { value: 'CY', label: 'Calendar Year' },
  { value: 'FY', label: 'Financial Year' },
];

const COMPARE_COLORS = [
  '#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#06b6d4','#f97316','#84cc16',
];

function toFY(dateStr) {
  // FY runs Jul–Jun in Australia, labelled by the ending year
  const [y, m] = dateStr.split('-').map(Number);
  return m >= 7 ? `FY${y + 1}` : `FY${y}`;
}

function toQtr(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  return `Q${Math.ceil(m / 3)} ${y}`;
}

function toCY(dateStr) {
  return dateStr.split('-')[0];
}

function aggregateRows(rows, agg) {
  // rows: [{date, value}]
  const buckets = {};
  for (const r of rows) {
    if (r.value == null) continue;
    let key;
    if (agg === 'M')  key = fmtDate(r.date);
    else if (agg === 'Q')  key = toQtr(r.date);
    else if (agg === 'CY') key = toCY(r.date);
    else if (agg === 'FY') key = toFY(r.date);
    if (!buckets[key]) buckets[key] = { sum: 0, count: 0 };
    buckets[key].sum += parseFloat(r.value);
    buckets[key].count++;
  }
  return Object.entries(buckets).map(([key, { sum, count }]) => ({ key, value: sum / count }));
}

function CompareTab({ region, vintages }) {
  const [curveType, setCurveType] = useState('energy_twa_monthly');
  const [agg, setAgg] = useState('Q');
  const [rawData, setRawData] = useState(null);
  const [selectedVintages, setSelectedVintages] = useState([]);

  // Default: all vintages selected
  useEffect(() => {
    if (vintages.length && selectedVintages.length === 0) setSelectedVintages(vintages);
  }, [vintages]);

  useEffect(() => {
    setRawData(null);
    fetch(`/api/price-curves?type=compare&region=${region}&curve_type=${curveType}`)
      .then((r) => r.json())
      .then((d) => setRawData(d.compare || []));
  }, [region, curveType]);

  if (!rawData) return <LoadingSpinner />;

  // Group by vintage
  const byVintage = {};
  for (const r of rawData) {
    if (!byVintage[r.vintage]) byVintage[r.vintage] = [];
    byVintage[r.vintage].push(r);
  }

  // Aggregate each vintage
  const aggByVintage = {};
  for (const [v, rows] of Object.entries(byVintage)) {
    aggByVintage[v] = aggregateRows(rows, agg);
  }

  // Build unified key list (sorted)
  const allKeys = [...new Set(
    Object.values(aggByVintage).flatMap((rows) => rows.map((r) => r.key))
  )].sort((a, b) => {
    // Sort by underlying date value
    if (agg === 'FY') return a.localeCompare(b);
    return a.localeCompare(b);
  });

  const chartData = allKeys.map((key) => {
    const point = { key };
    for (const v of selectedVintages) {
      const row = (aggByVintage[v] || []).find((r) => r.key === key);
      point[v] = row ? row.value : null;
    }
    return point;
  });

  const toggleVintage = (v) =>
    setSelectedVintages((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Curve</label>
          <select
            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
            value={curveType}
            onChange={(e) => setCurveType(e.target.value)}
          >
            {COMPARE_CURVES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Aggregation</label>
          <div className="flex gap-1">
            {AGGS.map((a) => (
              <button
                key={a.value}
                onClick={() => setAgg(a.value)}
                className={`px-2.5 py-1.5 text-xs rounded border font-medium ${
                  agg === a.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vintage toggles */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {vintages.map((v, i) => (
          <button
            key={v}
            onClick={() => toggleVintage(v)}
            className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-colors ${
              selectedVintages.includes(v)
                ? 'text-white border-transparent'
                : 'bg-white text-gray-500 border-gray-300'
            }`}
            style={selectedVintages.includes(v) ? { backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length] } : {}}
          >
            {vintageLabel(v)}
          </button>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        {COMPARE_CURVES.find((c) => c.value === curveType)?.label} — {region} — by vintage
      </h3>

      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="key"
            tick={{ fontSize: 10 }}
            interval={agg === 'M' ? 5 : 0}
            angle={agg === 'M' ? -30 : 0}
            textAnchor={agg === 'M' ? 'end' : 'middle'}
            height={agg === 'M' ? 50 : 30}
          />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            formatter={(v, name) => [`$${Number(v).toFixed(2)}`, vintageLabel(name)]}
            labelStyle={{ fontWeight: 600 }}
          />
          <Legend formatter={(name) => vintageLabel(name)} />
          {selectedVintages.map((v, i) => (
            <Line
              key={v}
              type="monotone"
              dataKey={v}
              stroke={COMPARE_COLORS[i % COMPARE_COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ForwardCurvesPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [vintages, setVintages] = useState([]);
  const [vintage, setVintage] = useState('');
  const [region, setRegion] = useState('NSW');

  useEffect(() => {
    fetch('/api/price-curves?type=vintages')
      .then((r) => r.json())
      .then((d) => {
        const vs = d.vintages || [];
        setVintages(vs);
        if (vs.length > 0) setVintage(vs[vs.length - 1]); // latest vintage
      });
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Forward Price Curves</h1>
        <p className="text-sm text-gray-500 mt-0.5">Aurora Energy Research — Australian power market forecasts</p>
      </div>

      <FilterBar
        vintages={vintages}
        vintage={vintage}
        setVintage={setVintage}
        region={region}
        setRegion={setRegion}
      />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === i
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        {!vintage ? (
          <LoadingSpinner />
        ) : (
          <>
            {activeTab === 0 && <EnergyTab vintage={vintage} region={region} />}
            {activeTab === 1 && <CaptureTab vintage={vintage} region={region} />}
            {activeTab === 2 && <SpreadsTab vintage={vintage} region={region} />}
            {activeTab === 3 && <LGCTab vintage={vintage} />}
            {activeTab === 4 && <CompareTab region={region} vintages={vintages} />}
          </>
        )}
      </div>
    </div>
  );
}
