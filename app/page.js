'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import FilterBar from '../components/FilterBar';
import BidderTable from '../components/BidderTable';
import ExportBar from '../components/ExportBar';
import Tabs from '../components/Tabs';

function isFIRBRisk(b) {
  return [b.csInsights, b.aiInsights, b.mergedInsights, b.aiScoreReason].join(' ').toLowerCase().includes('firb');
}

function isSuggestUpgrade(b) {
  return Number(b.tier) >= 2 && (b.aiLabel === 'A' || b.aiLabel === 'B');
}

export default function Home() {
  const [bidders, setBidders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [crmTab, setCrmTab] = useState('all');
  const [filters, setFilters] = useState({
    search: '',
    tier: '',
    type: '',
    geographies: [],
  });
  const [selected, setSelected] = useState(new Set());
  const [insightStatus, setInsightStatus] = useState({});

  useEffect(() => {
    Promise.all([
      fetch('/api/bidders').then((r) => r.json()),
      fetch('/api/insight-status').then((r) => r.json()),
    ]).then(([data, statuses]) => {
      setBidders(data);
      setInsightStatus(statuses);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const updateInsightStatus = useCallback((bidderNo, status) => {
    setInsightStatus((prev) => ({ ...prev, [bidderNo]: status }));
    fetch('/api/insight-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bidderNo, status }),
    });
  }, []);

  const handleAccept = useCallback((bidderNo) => updateInsightStatus(bidderNo, 'accepted'), [updateInsightStatus]);
  const handleReject = useCallback((bidderNo) => updateInsightStatus(bidderNo, 'rejected'), [updateInsightStatus]);

  const geographies = useMemo(() => {
    const set = new Set(bidders.map((b) => b.geography).filter(Boolean));
    return [...set].sort();
  }, [bidders]);

  const tabCounts = useMemo(() => ({
    all: bidders.length,
    tier1: bidders.filter((b) => Number(b.tier) === 1).length,
    tier2: bidders.filter((b) => Number(b.tier) === 2).length,
    upgrade: bidders.filter(isSuggestUpgrade).length,
    firb: bidders.filter(isFIRBRisk).length,
  }), [bidders]);

  const filtered = useMemo(() => {
    return bidders.filter((b) => {
      if (filters.tier && String(b.tier) !== filters.tier) return false;
      if (filters.type && b.type !== filters.type) return false;
      if (filters.geographies.length > 0 && !filters.geographies.includes(b.geography)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = [b.name, b.parentOwner, b.csInsights, b.aiInsights].map((s) => (s || '').toLowerCase()).join(' ');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bidders, filters]);

  const tabFiltered = useMemo(() => {
    if (crmTab === 'tier1') return filtered.filter((b) => Number(b.tier) === 1);
    if (crmTab === 'tier2') return filtered.filter((b) => Number(b.tier) === 2);
    if (crmTab === 'upgrade') return filtered.filter(isSuggestUpgrade);
    if (crmTab === 'firb') return filtered.filter(isFIRBRisk);
    if (crmTab === 'geography') return [...filtered].sort((a, b) => (a.geography || '').localeCompare(b.geography || ''));
    return filtered;
  }, [filtered, crmTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">Loading bidders...</div>
      </div>
    );
  }

  return (
    <div>
      <Tabs
        tabs={[
          { id: 'all', label: 'All Bidders', count: tabCounts.all },
          { id: 'tier1', label: 'Tier 1', count: tabCounts.tier1 },
          { id: 'tier2', label: 'Tier 2', count: tabCounts.tier2 },
          { id: 'upgrade', label: 'Suggest Upgrade', count: tabCounts.upgrade },
          { id: 'firb', label: 'FIRB Risk', count: tabCounts.firb },
          { id: 'geography', label: 'By Geography' },
        ]}
        activeTab={crmTab}
        onChange={setCrmTab}
      />
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-gray-700">
          {tabFiltered.length} of {bidders.length} bidders
          {selected.size > 0 && (
            <span className="ml-2 text-blue-600">({selected.size} selected)</span>
          )}
        </h2>
      </div>
      <FilterBar filters={filters} setFilters={setFilters} geographies={geographies} />
      <ExportBar filteredBidders={tabFiltered} allBidders={bidders} selected={selected} insightStatus={insightStatus} />
      <BidderTable
        bidders={tabFiltered}
        selected={selected}
        setSelected={setSelected}
        insightStatus={insightStatus}
        onAcceptInsight={handleAccept}
        onRejectInsight={handleReject}
      />
    </div>
  );
}
