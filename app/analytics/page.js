'use client';

import { useState, useEffect, useMemo } from 'react';
import marketData from '../../data/australia-market.json';
import capexData from '../../data/capex-data.json';

function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  };
  return (
    <div className={`border rounded-lg p-4 ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium mt-0.5">{label}</div>
      {sub && <div className="text-xs mt-1 opacity-70">{sub}</div>}
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <h2 className="text-base font-semibold text-gray-800 mb-3 mt-6 border-b border-gray-200 pb-1">
      {title}
    </h2>
  );
}

function BarRow({ label, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-40 text-sm text-gray-700 truncate shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 text-sm text-gray-600 text-right shrink-0">
        {count} <span className="text-gray-400 text-xs">({pct}%)</span>
      </span>
    </div>
  );
}

const TIER_LABELS = { 1: 'Tier 1', 2: 'Tier 2', 3: 'Tier 3', 4: 'Tier 4' };

function isFIRBRisk(b) {
  const text = [b.csInsights, b.aiInsights, b.mergedInsights, b.aiScoreReason].join(' ').toLowerCase();
  return text.includes('firb');
}

function isVeryActive(b) {
  const text = [b.aiInsights, b.aiScoreReason].join(' ').toLowerCase();
  return text.includes('very active');
}

function isAbandoned(b) {
  const text = [b.csInsights, b.aiInsights, b.mergedInsights].join(' ').toLowerCase();
  return (
    text.includes('no longer') ||
    text.includes('withdrawn') ||
    text.includes('abandoned') ||
    text.includes('unlikely acquirer') ||
    text.includes('won\'t') ||
    text.includes('not interested')
  );
}

function isSuggestUpgrade(b) {
  // Bidder is in tier 2+ but has aiLabel A or B (high AI score)
  const tier = Number(b.tier);
  const label = (b.aiLabel || '').toUpperCase();
  return tier >= 2 && (label === 'A' || label === 'B');
}

const COLS_TIER1 = ['#', 'Name', 'Geography', 'Type', 'AI Label', 'AI Score', 'Insights'];
const COLS_UPGRADE = ['#', 'Name', 'Tier', 'AI Label', 'Geography', 'Reason'];
const COLS_FIRB = ['#', 'Name', 'Geography', 'Tier', 'Type', 'AI Insights'];

export default function AnalyticsPage() {
  const [bidders, setBidders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTable, setActiveTable] = useState('tier1');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/bidders')
      .then((r) => r.json())
      .then((data) => {
        setBidders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    if (!bidders.length) return null;

    // Tier distribution
    const tierCounts = {};
    for (let t = 1; t <= 4; t++) tierCounts[t] = 0;
    let untiered = 0;
    for (const b of bidders) {
      const t = Number(b.tier);
      if (t >= 1 && t <= 4) tierCounts[t]++;
      else untiered++;
    }

    // Type breakdown
    const typeCounts = {};
    for (const b of bidders) {
      const t = b.type || 'Unknown';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }

    // Geography breakdown
    const geoCounts = {};
    for (const b of bidders) {
      const g = b.geography || 'Unknown';
      geoCounts[g] = (geoCounts[g] || 0) + 1;
    }

    // Insight flags
    const suggestUpgrade = bidders.filter(isSuggestUpgrade);
    const firbRisk = bidders.filter(isFIRBRisk);
    const veryActive = bidders.filter(isVeryActive);
    const abandoned = bidders.filter(isAbandoned);
    const tier1 = bidders.filter((b) => Number(b.tier) === 1);

    return {
      total: bidders.length,
      tierCounts,
      untiered,
      typeCounts,
      geoCounts,
      suggestUpgrade,
      firbRisk,
      veryActive,
      abandoned,
      tier1,
    };
  }, [bidders]);

  const tableData = useMemo(() => {
    if (!stats) return [];
    const map = { tier1: stats.tier1, upgrade: stats.suggestUpgrade, firb: stats.firbRisk };
    const list = map[activeTable] || [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((b) =>
      [b.name, b.geography, b.type, b.csInsights, b.aiInsights, b.aiScoreReason]
        .map((s) => (s || '').toLowerCase())
        .join(' ')
        .includes(q)
    );
  }, [stats, activeTable, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-500">
        Loading analytics…
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-red-500">
        Failed to load data.
      </div>
    );
  }

  const sortedTypes = Object.entries(stats.typeCounts).sort((a, b) => b[1] - a[1]);
  const sortedGeos = Object.entries(stats.geoCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{stats.total} bidders tracked</p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
        <StatCard label="Tier 1 Bidders" value={stats.tier1.length} color="blue" />
        <StatCard label="Very Active" value={stats.veryActive.length} sub="high engagement signals" color="green" />
        <StatCard label="Suggest Upgrade" value={stats.suggestUpgrade.length} sub="Tier 2+ with A/B AI score" color="amber" />
        <StatCard label="FIRB Risk" value={stats.firbRisk.length} sub="foreign investment flag" color="red" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
        {[1, 2, 3, 4].map((t) => (
          <StatCard
            key={t}
            label={TIER_LABELS[t]}
            value={stats.tierCounts[t]}
            color="gray"
          />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Untiered" value={stats.untiered} color="gray" />
        <StatCard label="Abandoned / Inactive" value={stats.abandoned.length} color="gray" />
        <StatCard label="Geographies" value={Object.keys(stats.geoCounts).length} color="gray" />
        <StatCard label="Bidder Types" value={Object.keys(stats.typeCounts).length} color="gray" />
      </div>

      {/* Breakdown charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div>
          <SectionHeader title="Type Breakdown" />
          {sortedTypes.map(([type, count]) => (
            <BarRow key={type} label={type} count={count} total={stats.total} />
          ))}
        </div>
        <div>
          <SectionHeader title="Geography Breakdown" />
          {sortedGeos.slice(0, 15).map(([geo, count]) => (
            <BarRow key={geo} label={geo} count={count} total={stats.total} />
          ))}
          {sortedGeos.length > 15 && (
            <p className="text-xs text-gray-400 mt-1">
              + {sortedGeos.length - 15} more geographies
            </p>
          )}
        </div>
      </div>

      {/* Filterable tables */}
      <SectionHeader title="Detailed Views" />
      <div className="flex gap-2 mb-3 flex-wrap">
        {[
          { key: 'tier1', label: `Tier 1 (${stats.tier1.length})` },
          { key: 'upgrade', label: `Suggest Upgrade (${stats.suggestUpgrade.length})` },
          { key: 'firb', label: `FIRB Risk (${stats.firbRisk.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setActiveTable(key); setSearch(''); }}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTable === key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="ml-auto px-3 py-1.5 border border-gray-300 rounded text-sm w-52 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {activeTable === 'tier1' && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {COLS_TIER1.map((c) => (
                    <th key={c} className="px-3 py-2.5 text-left font-medium text-gray-600 text-xs">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableData.map((b, i) => (
                  <tr key={b.no} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 text-gray-500 w-8">{b.no}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{b.name}</td>
                    <td className="px-3 py-2 text-gray-600">{b.geography}</td>
                    <td className="px-3 py-2 text-gray-600">{b.type}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${
                        b.aiLabel === 'A' ? 'bg-green-100 text-green-700' :
                        b.aiLabel === 'B' ? 'bg-blue-100 text-blue-700' :
                        b.aiLabel === 'C' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {b.aiLabel || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{b.aiScore || '-'}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-xs truncate" title={b.mergedInsights || b.aiInsights}>
                      {b.mergedInsights || b.aiInsights || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTable === 'upgrade' && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {COLS_UPGRADE.map((c) => (
                    <th key={c} className="px-3 py-2.5 text-left font-medium text-gray-600 text-xs">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableData.map((b, i) => (
                  <tr key={b.no} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 text-gray-500 w-8">{b.no}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{b.name}</td>
                    <td className="px-3 py-2 text-gray-600">{b.tier}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${
                        b.aiLabel === 'A' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {b.aiLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{b.geography}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-xs truncate" title={b.aiScoreReason}>
                      {b.aiScoreReason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTable === 'firb' && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {COLS_FIRB.map((c) => (
                    <th key={c} className="px-3 py-2.5 text-left font-medium text-gray-600 text-xs">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableData.map((b, i) => (
                  <tr key={b.no} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 text-gray-500 w-8">{b.no}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{b.name}</td>
                    <td className="px-3 py-2 text-gray-600">{b.geography}</td>
                    <td className="px-3 py-2 text-gray-600">{b.tier}</td>
                    <td className="px-3 py-2 text-gray-600">{b.type}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-xs truncate" title={b.aiInsights}>
                      {b.aiInsights || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tableData.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500">No results found.</div>
          )}
        </div>
        <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          Showing {tableData.length} record{tableData.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Australia Market Context Panel */}
      <SectionHeader title="Australia Market Context" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Market Overview</h3>
          <dl className="space-y-2">
            {[
              ['Renewable Share', marketData.marketOverview.currentRenewableShare],
              ['2030 Target', marketData.marketOverview.target2030],
              ['FY2024-25 New Capacity', marketData.marketOverview.installedCapacityFY2425],
              ['Grid Pipeline', marketData.marketOverview.gridConnectionPipeline],
              ['Rooftop Solar', marketData.marketOverview.rooftopSolar],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="text-xs font-medium text-gray-500 w-36 shrink-0">{k}</dt>
                <dd className="text-xs text-gray-700">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Capacity Investment Scheme (CIS)</h3>
          <dl className="space-y-2">
            {[
              ['Target', marketData.keyPolicy.capacityInvestmentScheme.target],
              ['Mechanism', marketData.keyPolicy.capacityInvestmentScheme.mechanism],
              ['Investment', marketData.keyPolicy.capacityInvestmentScheme.expectedInvestment],
              ['Cumulative Awarded', marketData.keyPolicy.capacityInvestmentScheme.tenderProgress.cumulativeAwarded],
              ['Tender 3 (Sep 2025)', marketData.keyPolicy.capacityInvestmentScheme.tenderProgress.tender3],
              ['Tender 7 (pending)', marketData.keyPolicy.capacityInvestmentScheme.tenderProgress.tender7],
              ['Key Risk', marketData.keyPolicy.capacityInvestmentScheme.keyRisk],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="text-xs font-medium text-gray-500 w-36 shrink-0">{k}</dt>
                <dd className="text-xs text-gray-700">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">FIRB Risk Landscape</h3>
          <dl className="space-y-2">
            {[
              ['Threshold (Gov)', marketData.keyPolicy.firb.threshold],
              ['Threshold (Private)', marketData.keyPolicy.firb.privateThreshold],
              ['Key Risk', marketData.keyPolicy.firb.keyRisk],
              ['Trend', marketData.keyPolicy.firb.recentTrend],
              ['Sembcorp Note', marketData.keyPolicy.firb.sembcorpNote],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="text-xs font-medium text-gray-500 w-36 shrink-0">{k}</dt>
                <dd className="text-xs text-gray-700">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">ACCC Merger Regime (new Jan 2026)</h3>
          <p className="text-xs text-gray-700 mb-3">{marketData.keyPolicy.accccMergerRegime.description}</p>
          <p className="text-xs text-gray-700">{marketData.keyPolicy.accccMergerRegime.impact}</p>
          <h3 className="text-sm font-semibold text-gray-700 mt-4 mb-3">2030 Targets</h3>
          <dl className="space-y-2">
            {[
              ['Federal', marketData.australiaRenewableTargets.federal2030],
              ['CIS Programme', marketData.australiaRenewableTargets.cisProgramme],
              ['New Capacity', marketData.australiaRenewableTargets.totalNewCapacityNeeded],
              ['Annual Rate', marketData.australiaRenewableTargets.annualInvestmentNeeded],
              ['AEMO 2050', marketData.australiaRenewableTargets.aemo2050Target],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="text-xs font-medium text-gray-500 w-36 shrink-0">{k}</dt>
                <dd className="text-xs text-gray-700">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Recent Transactions */}
      <SectionHeader title="Recent Major Transactions" />
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Date', 'Deal', 'Value', 'Status / Significance'].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium text-gray-600 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {marketData.majorTransactions2024_2026.map((tx, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2 text-xs text-gray-500 w-28 shrink-0">{tx.date}</td>
                  <td className="px-3 py-2 font-medium text-gray-900 text-xs">{tx.deal}</td>
                  <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">{tx.value}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 max-w-sm">{tx.significance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent News */}
      <SectionHeader title="Recent News & Intelligence" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {marketData.recentNews.slice(0, 8).map((item, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-900">{item.headline}</span>
              <span className="text-xs text-gray-400 shrink-0">{item.date}</span>
            </div>
            {item.source && (
              <span className="inline-block text-xs text-blue-600 mb-1">— {item.source}</span>
            )}
            <p className="text-xs text-gray-600">{item.detail}</p>
          </div>
        ))}
      </div>

      {/* Capex / AUM Panel */}
      <SectionHeader title="Investor AUM & Australia Capex" />
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
          <p className="text-xs text-gray-500">{capexData._notes}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Investor', 'AUM', 'AU Capex 2024-25', 'Notes'].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium text-gray-600 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(capexData)
                .filter(([k]) => k !== '_notes' && k !== 'Global summary')
                .map(([name, data], i) => (
                  <tr key={name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 font-medium text-gray-900 text-xs w-44">{name}</td>
                    <td className="px-3 py-2 text-xs text-gray-700 w-40">
                      {data.aum || data.revenue || data.installedCapacity || data.marketCap || '-'}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700 w-44">{data.australiaCapex2024 || '-'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 max-w-sm">{data.notes || '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 bg-blue-50 border-t border-gray-200">
          <div className="flex flex-wrap gap-4 text-xs text-gray-700">
            <span><span className="font-medium">Total Foreign Capex:</span> {capexData['Global summary'].totalForeignCapexAustralia2024_2025}</span>
            <span><span className="font-medium">Dominant Types:</span> {capexData['Global summary'].dominantInvestorTypes}</span>
            <span><span className="font-medium">Notable Absent:</span> {capexData['Global summary'].notableAbsent}</span>
          </div>
        </div>
      </div>

      {/* Key Transmission Projects */}
      <SectionHeader title="Key Transmission & Infrastructure" />
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Project', 'Capex', 'Description', 'Status'].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium text-gray-600 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {marketData.keyTransmission.map((tx, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2 font-medium text-gray-900 text-xs">{tx.project}</td>
                  <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">{tx.capex}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 max-w-xs">{tx.description}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 max-w-xs">{tx.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
