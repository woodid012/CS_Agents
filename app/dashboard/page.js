'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import marketData from '../../data/australia-market.json';
import bessData from '../../data/bess-market.json';

// ─── Helper functions (mirrors analytics page logic) ─────────────────────────

function isFIRBRisk(b) {
  const text = [b.csInsights, b.aiInsights, b.mergedInsights, b.aiScoreReason].join(' ').toLowerCase();
  return text.includes('firb');
}

function isSuggestUpgrade(b) {
  const tier = Number(b.tier);
  const label = (b.aiLabel || '').toUpperCase();
  return tier >= 2 && (label === 'A' || label === 'B');
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent = '#2563eb', linkHref }) {
  const inner = (
    <div
      className="bg-white border border-gray-200 rounded p-4 flex flex-col gap-1 hover:shadow-md transition-shadow cursor-default"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
  if (linkHref) {
    return (
      <Link href={linkHref} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

// ─── AI Label badge ───────────────────────────────────────────────────────────

function LabelBadge({ label }) {
  const map = {
    A: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    B: 'bg-blue-100 text-blue-800 border-blue-300',
    C: 'bg-amber-100 text-amber-800 border-amber-300',
    D: 'bg-red-100 text-red-800 border-red-300',
  };
  return (
    <span
      className={`inline-block border rounded px-1.5 py-0.5 text-[11px] font-bold ${map[label] || 'bg-gray-100 text-gray-600 border-gray-300'}`}
    >
      {label || '—'}
    </span>
  );
}

// ─── Market Stat Row ──────────────────────────────────────────────────────────

function MktRow({ label, value }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-gray-100 last:border-0 gap-2">
      <span className="text-xs text-gray-500 shrink-0 w-36">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right">{value}</span>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function PanelHeader({ title, accent = '#1e40af' }) {
  return (
    <div
      className="px-3 py-2 flex items-center gap-2"
      style={{ background: accent }}
    >
      <span className="text-xs font-bold uppercase tracking-widest text-white">{title}</span>
    </div>
  );
}

// ─── Quick link button ────────────────────────────────────────────────────────

function QuickLink({ href, label, icon }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
    >
      {icon && <span>{icon}</span>}
      {label}
    </Link>
  );
}

// ─── Active View Pill ─────────────────────────────────────────────────────────

function ViewPill({ label, active, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors border ${
        active
          ? 'bg-blue-700 text-white border-blue-700'
          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-700'
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            active ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [bidders, setBidders] = useState([]);
  const [offtakers, setOfftakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('tier1');

  useEffect(() => {
    Promise.all([
      fetch('/api/bidders').then((r) => r.json()),
      fetch('/api/offtakers').then((r) => r.json()),
    ])
      .then(([b, o]) => {
        setBidders(b);
        setOfftakers(o);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    if (!bidders.length) return null;
    const tier1 = bidders.filter((b) => Number(b.tier) === 1);
    const tier2 = bidders.filter((b) => Number(b.tier) === 2);
    const upgrade = bidders.filter(isSuggestUpgrade);
    const firb = bidders.filter(isFIRBRisk);
    return { total: bidders.length, tier1, tier2, upgrade, firb };
  }, [bidders]);

  const tableRows = useMemo(() => {
    if (!stats) return [];
    if (activeView === 'tier1') {
      return [...stats.tier1]
        .sort((a, b) => (Number(b.aiScore) || 0) - (Number(a.aiScore) || 0))
        .slice(0, 10);
    }
    if (activeView === 'upgrade') return stats.upgrade.slice(0, 10);
    if (activeView === 'firb') return stats.firb.slice(0, 10);
    if (activeView === 'geo') {
      return [...bidders]
        .filter((b) => b.geography)
        .sort((a, b) => (a.geography || '').localeCompare(b.geography || ''))
        .slice(0, 10);
    }
    return [];
  }, [activeView, stats, bidders]);

  // ─── Market snapshot data ─────────────────────────────────────────────────

  const auMarket = {
    reShare: marketData.marketOverview?.currentRenewableShare?.split(',')[0] || '~40%',
    target2030: marketData.marketOverview?.target2030 || '82% by 2030',
    cisCumulative: marketData.keyPolicy?.capacityInvestmentScheme?.tenderProgress?.cumulativeAwarded || '—',
    cisTarget: marketData.keyPolicy?.capacityInvestmentScheme?.target || '40 GW by 2030',
    t3: marketData.keyPolicy?.capacityInvestmentScheme?.tenderProgress?.tender3 || '—',
    t8: marketData.keyPolicy?.capacityInvestmentScheme?.tenderProgress?.tender8 || '—',
    firbNote: marketData.keyPolicy?.firb?.keyRisk || '—',
  };

  const bessMarket = {
    costTrend: bessData.marketOverview?.costTrend || '—',
    cisTarget: bessData.marketOverview?.cisBESSTarget || '—',
    investment2024: bessData.marketOverview?.investment2024 || '—',
    t3detail: bessData.marketOverview?.costTrend || '—',
    dominantTech: bessData.marketOverview?.dominantTech || '—',
  };

  const AS_OF = 'As of March 2026';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm font-mono animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Deal Intelligence Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {AS_OF} · Australian Renewable Energy &amp; BESS M&amp;A
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-6 gap-3">
        <StatCard
          label="Total Bidders"
          value={stats?.total ?? '—'}
          sub="tracked in CRM"
          accent="#1e40af"
          linkHref="/"
        />
        <StatCard
          label="Tier 1"
          value={stats?.tier1.length ?? '—'}
          sub="priority targets"
          accent="#059669"
          linkHref="/analytics"
        />
        <StatCard
          label="Tier 2"
          value={stats?.tier2.length ?? '—'}
          sub="active pipeline"
          accent="#0284c7"
          linkHref="/analytics"
        />
        <StatCard
          label="Suggest Upgrade"
          value={stats?.upgrade.length ?? '—'}
          sub="T2+ with A/B AI label"
          accent="#d97706"
          linkHref="/analytics"
        />
        <StatCard
          label="FIRB Risk"
          value={stats?.firb.length ?? '—'}
          sub="flagged bidders"
          accent="#dc2626"
          linkHref="/analytics"
        />
        <StatCard
          label="Offtakers"
          value={offtakers.length || '—'}
          sub="tracked counterparties"
          accent="#7c3aed"
          linkHref="/offtakers"
        />
      </div>

      {/* ── Two-column body ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 items-start">

        {/* ── LEFT: Bidder table (2/3) ─────────────────────────────────────── */}
        <div className="col-span-2 space-y-3">

          {/* View selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <ViewPill
              label="Tier 1"
              active={activeView === 'tier1'}
              onClick={() => setActiveView('tier1')}
              count={stats?.tier1.length}
            />
            <ViewPill
              label="Suggest Upgrade"
              active={activeView === 'upgrade'}
              onClick={() => setActiveView('upgrade')}
              count={stats?.upgrade.length}
            />
            <ViewPill
              label="FIRB Risk"
              active={activeView === 'firb'}
              onClick={() => setActiveView('firb')}
              count={stats?.firb.length}
            />
            <ViewPill
              label="By Geography"
              active={activeView === 'geo'}
              onClick={() => setActiveView('geo')}
            />
            <Link
              href="/analytics"
              className="ml-auto text-xs text-blue-600 hover:underline font-medium"
            >
              Full Analytics →
            </Link>
          </div>

          {/* Table */}
          <div className="border border-gray-200 rounded overflow-hidden shadow-sm">
            <PanelHeader
              title={
                activeView === 'tier1' ? 'Top Tier 1 Bidders — by AI Score' :
                activeView === 'upgrade' ? 'Suggest Upgrade — Tier 2+ with A/B AI Label' :
                activeView === 'firb' ? 'FIRB Risk Flagged Bidders' :
                'Bidders — Sorted by Geography'
              }
            />
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left w-6">#</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Geography</th>
                  {activeView === 'upgrade' && <th className="px-3 py-2 text-left">Tier</th>}
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-center">Label</th>
                  <th className="px-3 py-2 text-center">Score</th>
                  <th className="px-3 py-2 text-left">AI Reason</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-gray-400">No data</td>
                  </tr>
                )}
                {tableRows.map((b, i) => (
                  <tr
                    key={b.no ?? i}
                    className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/30 transition-colors`}
                  >
                    <td className="px-3 py-2 text-gray-400 font-mono">{b.no}</td>
                    <td className="px-3 py-2 font-semibold text-gray-900 max-w-[160px] truncate">{b.name}</td>
                    <td className="px-3 py-2 text-gray-600">{b.geography || '—'}</td>
                    {activeView === 'upgrade' && (
                      <td className="px-3 py-2 text-gray-600 font-mono">T{b.tier}</td>
                    )}
                    <td className="px-3 py-2 text-gray-500">{b.type || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <LabelBadge label={b.aiLabel} />
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-gray-700 font-mono">{b.aiScore ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-500 max-w-[220px] truncate">{b.aiScoreReason || b.aiInsights || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 font-mono">
              Showing top {tableRows.length} results · <Link href="/analytics" className="text-blue-500 hover:underline">View all in Analytics</Link>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Market snapshots (1/3) ────────────────────────────────── */}
        <div className="col-span-1 space-y-3">

          {/* AU Market Snapshot */}
          <div className="border border-gray-200 rounded overflow-hidden shadow-sm">
            <PanelHeader title="AU Renewables Market" accent="#1e3a5f" />
            <div className="px-3 py-2 bg-white">
              <MktRow label="RE Share (Q4 2025)" value={auMarket.reShare} />
              <MktRow label="2030 Target" value={auMarket.target2030} />
              <MktRow label="CIS Target" value={auMarket.cisTarget} />
              <MktRow label="CIS Awarded" value={auMarket.cisCumulative} />
              <MktRow label="CIS Tender 3" value="4.13 GW / 15.37 GWh BESS" />
              <MktRow label="CIS Tender 8" value="NEM storage · seeking 16 GWh" />
            </div>
            <div className="px-3 py-2 border-t border-amber-100 bg-amber-50">
              <p className="text-[10px] text-amber-800 font-medium leading-snug">
                FIRB: {auMarket.firbNote}
              </p>
            </div>
          </div>

          {/* BESS Market Snapshot */}
          <div className="border border-gray-200 rounded overflow-hidden shadow-sm">
            <PanelHeader title="BESS Market" accent="#065f46" />
            <div className="px-3 py-2 bg-white">
              <MktRow label="Cost Trend" value="A$700–900k/MWh (2-hr, all-in)" />
              <MktRow label="Cost decline" value="~60% fall 2018–2024" />
              <MktRow label="CIS BESS Target" value={bessMarket.cisTarget} />
              <MktRow label="Total investment 2024" value={bessMarket.investment2024} />
              <MktRow label="Dominant tech" value={bessMarket.dominantTech} />
              <MktRow label="Grid pipeline" value="64 GW in connection queue (46% BESS)" />
            </div>
          </div>

          {/* Quick Links */}
          <div className="border border-gray-200 rounded overflow-hidden shadow-sm">
            <PanelHeader title="Quick Links" accent="#374151" />
            <div className="px-3 py-3 bg-white grid grid-cols-1 gap-1.5">
              <QuickLink href="/analytics" label="Full Analytics Dashboard" icon="📊" />
              <QuickLink href="/market-data/capex-opex" label="Investor Capex / AUM" icon="💰" />
              <QuickLink href="/development-tracker" label="Development Tracker" icon="🏗️" />
              <QuickLink href="/market-data/price-curves" label="Price Curves" icon="📈" />
              <QuickLink href="/offtakers" label="Offtaker Engagement" icon="⚡" />
              <QuickLink href="/ai-agents" label="AI Agents" icon="🤖" />
            </div>
          </div>

          {/* Data freshness */}
          <div className="text-[10px] text-gray-400 font-mono text-right">
            Market data enriched {AS_OF}
          </div>
        </div>
      </div>
    </div>
  );
}
