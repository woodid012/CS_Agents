'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import FilterBar from '../components/FilterBar';
import BidderTable from '../components/BidderTable';
import ExportBar from '../components/ExportBar';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isFIRBRisk(b) {
  return [b.csInsights, b.aiInsights, b.mergedInsights, b.aiScoreReason]
    .join(' ')
    .toLowerCase()
    .includes('firb');
}

function isSuggestUpgrade(b) {
  return Number(b.tier) >= 2 && ['A', 'B'].includes((b.aiLabel || '').toUpperCase());
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, color, active, onClick }) {
  const base =
    'border rounded-lg px-4 py-3 transition-all select-none ' +
    (onClick ? 'cursor-pointer' : '');

  const styles = {
    blue: active
      ? 'bg-blue-600 border-blue-600 shadow-sm'
      : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm',
    green: active
      ? 'bg-emerald-600 border-emerald-600 shadow-sm'
      : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-sm',
    amber: active
      ? 'bg-amber-500 border-amber-500 shadow-sm'
      : 'bg-white border-gray-200 hover:border-amber-300 hover:shadow-sm',
    red: active
      ? 'bg-red-600 border-red-600 shadow-sm'
      : 'bg-white border-gray-200 hover:border-red-300 hover:shadow-sm',
  };

  const valueColor = active ? 'text-white' : 'text-gray-900';
  const labelColor = active ? 'text-white/75' : 'text-gray-500';

  return (
    <div className={`${base} ${styles[color]}`} onClick={onClick}>
      <div className={`text-2xl font-bold tabular-nums leading-none ${valueColor}`}>{value}</div>
      <div className={`text-xs font-medium mt-1.5 ${labelColor}`}>{label}</div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [bidders, setBidders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    tier: '',
    type: '',
    geographies: [],
  });
  const [selected, setSelected] = useState(new Set());
  const [insightStatus, setInsightStatus] = useState({});
  const [activeFilter, setActiveFilter] = useState(null); // 'tier1' | 'upgrade' | 'firb' | null

  useEffect(() => {
    Promise.all([
      fetch('/api/bidders').then((r) => r.json()),
      fetch('/api/insight-status').then((r) => r.json()),
    ])
      .then(([data, statuses]) => {
        setBidders(data);
        setInsightStatus(statuses);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updateInsightStatus = useCallback((bidderNo, status) => {
    setInsightStatus((prev) => ({ ...prev, [bidderNo]: status }));
    fetch('/api/insight-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bidderNo, status }),
    });
  }, []);

  const handleAccept = useCallback(
    (bidderNo) => updateInsightStatus(bidderNo, 'accepted'),
    [updateInsightStatus]
  );
  const handleReject = useCallback(
    (bidderNo) => updateInsightStatus(bidderNo, 'rejected'),
    [updateInsightStatus]
  );

  const geographies = useMemo(() => {
    const set = new Set(bidders.map((b) => b.geography).filter(Boolean));
    return [...set].sort();
  }, [bidders]);

  const stats = useMemo(
    () => ({
      total: bidders.length,
      tier1: bidders.filter((b) => Number(b.tier) === 1).length,
      upgrade: bidders.filter(isSuggestUpgrade).length,
      firb: bidders.filter(isFIRBRisk).length,
    }),
    [bidders]
  );

  const filtered = useMemo(() => {
    return bidders.filter((b) => {
      if (activeFilter === 'tier1' && Number(b.tier) !== 1) return false;
      if (activeFilter === 'upgrade' && !isSuggestUpgrade(b)) return false;
      if (activeFilter === 'firb' && !isFIRBRisk(b)) return false;
      if (filters.tier && String(b.tier) !== filters.tier) return false;
      if (filters.type && b.type !== filters.type) return false;
      if (filters.geographies.length > 0 && !filters.geographies.includes(b.geography))
        return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = [b.name, b.parentOwner, b.csInsights, b.aiInsights]
          .map((s) => (s || '').toLowerCase())
          .join(' ');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bidders, filters, activeFilter]);

  const toggleFilter = (key) => setActiveFilter((prev) => (prev === key ? null : key));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading bidders…</div>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Master Bidder List</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Bidder engagement tracking · AI-scored pipeline
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
          <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
            Live data
          </span>
        </div>
      </div>

      {/* Stat cards — clickable filters */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Total Bidders"
          value={stats.total}
          color="blue"
          active={false}
          onClick={null}
        />
        <StatCard
          label="Tier 1"
          value={stats.tier1}
          color="green"
          active={activeFilter === 'tier1'}
          onClick={() => toggleFilter('tier1')}
        />
        <StatCard
          label="Suggest Upgrade"
          value={stats.upgrade}
          color="amber"
          active={activeFilter === 'upgrade'}
          onClick={() => toggleFilter('upgrade')}
        />
        <StatCard
          label="FIRB Risk"
          value={stats.firb}
          color="red"
          active={activeFilter === 'firb'}
          onClick={() => toggleFilter('firb')}
        />
      </div>

      {/* Active quick-filter badge */}
      {activeFilter && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <span className="text-gray-500">Showing:</span>
          <span className="font-medium text-gray-900">
            {activeFilter === 'tier1'
              ? 'Tier 1'
              : activeFilter === 'upgrade'
              ? 'Suggest Upgrade'
              : 'FIRB Risk'}
          </span>
          <button
            onClick={() => setActiveFilter(null)}
            className="ml-1 text-gray-400 hover:text-gray-700 text-base leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">
          {filtered.length} of {bidders.length} bidders
          {selected.size > 0 && (
            <span className="ml-2 text-blue-600">({selected.size} selected)</span>
          )}
        </span>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} geographies={geographies} />
      <ExportBar
        filteredBidders={filtered}
        allBidders={bidders}
        selected={selected}
        insightStatus={insightStatus}
      />
      <BidderTable
        bidders={filtered}
        selected={selected}
        setSelected={setSelected}
        insightStatus={insightStatus}
        onAcceptInsight={handleAccept}
        onRejectInsight={handleReject}
      />
    </div>
  );
}
