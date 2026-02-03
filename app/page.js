'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import FilterBar from '../components/FilterBar';
import BidderTable from '../components/BidderTable';
import ExportBar from '../components/ExportBar';

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

  const handleAccept = useCallback((bidderNo) => {
    updateInsightStatus(bidderNo, 'accepted');
  }, [updateInsightStatus]);

  const handleReject = useCallback((bidderNo) => {
    updateInsightStatus(bidderNo, 'rejected');
  }, [updateInsightStatus]);

  const geographies = useMemo(() => {
    const set = new Set(bidders.map((b) => b.geography).filter(Boolean));
    return [...set].sort();
  }, [bidders]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">Loading bidders...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-gray-700">
          {filtered.length} of {bidders.length} bidders
          {selected.size > 0 && (
            <span className="ml-2 text-blue-600">({selected.size} selected)</span>
          )}
        </h2>
      </div>
      <FilterBar filters={filters} setFilters={setFilters} geographies={geographies} />
      <ExportBar filteredBidders={filtered} allBidders={bidders} selected={selected} insightStatus={insightStatus} />
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
