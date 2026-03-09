'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import OfftakerFilterBar from '../../components/OfftakerFilterBar';
import OfftakerTable from '../../components/OfftakerTable';
import OfftakerExportBar from '../../components/OfftakerExportBar';

// ─── Stat card ────────────────────────────────────────────────────────────────

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
    purple: active
      ? 'bg-purple-600 border-purple-600 shadow-sm'
      : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-sm',
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

export default function OfftakersPage() {
  const [offtakers, setOfftakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    archetype: '',
    convHeld: '',
  });
  const [selected, setSelected] = useState(new Set());
  const [insightStatus, setInsightStatus] = useState({});
  const [activeFilter, setActiveFilter] = useState(null); // 'engaged' | 'pending' | null

  useEffect(() => {
    Promise.all([
      fetch('/api/offtakers').then((r) => r.json()),
      fetch('/api/offtaker-insight-status').then((r) => r.json()),
    ])
      .then(([data, statuses]) => {
        setOfftakers(data);
        setInsightStatus(statuses);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updateInsightStatus = useCallback((bidderNo, status) => {
    setInsightStatus((prev) => ({ ...prev, [bidderNo]: status }));
    fetch('/api/offtaker-insight-status', {
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

  const stats = useMemo(() => {
    const engaged = offtakers.filter((o) => {
      const held = String(o.conversationHeld).trim().toLowerCase();
      return held === 'yes' || held === 'y';
    });
    const archetypes = new Set(offtakers.map((o) => o.archetype).filter(Boolean));
    return {
      total: offtakers.length,
      engaged: engaged.length,
      pending: offtakers.length - engaged.length,
      archetypes: archetypes.size,
    };
  }, [offtakers]);

  const filtered = useMemo(() => {
    return offtakers.filter((o) => {
      if (activeFilter === 'engaged') {
        const held = String(o.conversationHeld).trim().toLowerCase();
        if (held !== 'yes' && held !== 'y') return false;
      }
      if (activeFilter === 'pending') {
        const held = String(o.conversationHeld).trim().toLowerCase();
        if (held === 'yes' || held === 'y') return false;
      }
      if (filters.archetype && o.archetype !== filters.archetype) return false;
      if (filters.convHeld) {
        const held = String(o.conversationHeld).trim().toLowerCase();
        const isYes = held === 'yes' || held === 'y';
        if (filters.convHeld === 'yes' && !isYes) return false;
        if (filters.convHeld === 'no' && isYes) return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = [o.name, o.archetype, o.contact, o.projectInterest, o.keyNotes, o.aiInsights]
          .map((s) => (s || '').toLowerCase())
          .join(' ');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [offtakers, filters, activeFilter]);

  const toggleFilter = (key) => setActiveFilter((prev) => (prev === key ? null : key));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading offtakers…</div>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Offtaker Engagement List</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Corporate PPA and offtake engagement tracking
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
          <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
            Live data
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Offtakers" value={stats.total} color="blue" active={false} onClick={null} />
        <StatCard
          label="Conversations Held"
          value={stats.engaged}
          color="green"
          active={activeFilter === 'engaged'}
          onClick={() => toggleFilter('engaged')}
        />
        <StatCard
          label="Pending Engagement"
          value={stats.pending}
          color="amber"
          active={activeFilter === 'pending'}
          onClick={() => toggleFilter('pending')}
        />
        <StatCard label="Archetypes" value={stats.archetypes} color="purple" active={false} onClick={null} />
      </div>

      {/* Active quick-filter badge */}
      {activeFilter && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <span className="text-gray-500">Showing:</span>
          <span className="font-medium text-gray-900">
            {activeFilter === 'engaged' ? 'Conversations Held' : 'Pending Engagement'}
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
          {filtered.length} of {offtakers.length} offtakers
          {selected.size > 0 && (
            <span className="ml-2 text-blue-600">({selected.size} selected)</span>
          )}
        </span>
      </div>

      <OfftakerFilterBar filters={filters} setFilters={setFilters} />
      <OfftakerExportBar
        filteredOfftakers={filtered}
        allOfftakers={offtakers}
        selected={selected}
        insightStatus={insightStatus}
      />
      <OfftakerTable
        offtakers={filtered}
        selected={selected}
        setSelected={setSelected}
        insightStatus={insightStatus}
        onAcceptInsight={handleAccept}
        onRejectInsight={handleReject}
      />
    </div>
  );
}
