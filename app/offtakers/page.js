'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import OfftakerFilterBar from '../../components/OfftakerFilterBar';
import OfftakerTable from '../../components/OfftakerTable';
import OfftakerExportBar from '../../components/OfftakerExportBar';

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

  useEffect(() => {
    Promise.all([
      fetch('/api/offtakers').then((r) => r.json()),
      fetch('/api/offtaker-insight-status').then((r) => r.json()),
    ]).then(([data, statuses]) => {
      setOfftakers(data);
      setInsightStatus(statuses);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const updateInsightStatus = useCallback((bidderNo, status) => {
    setInsightStatus((prev) => ({ ...prev, [bidderNo]: status }));
    fetch('/api/offtaker-insight-status', {
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

  const filtered = useMemo(() => {
    return offtakers.filter((o) => {
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
  }, [offtakers, filters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">Loading offtakers...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-gray-700">
          {filtered.length} of {offtakers.length} offtakers
          {selected.size > 0 && (
            <span className="ml-2 text-blue-600">({selected.size} selected)</span>
          )}
        </h2>
      </div>
      <OfftakerFilterBar filters={filters} setFilters={setFilters} />
      <OfftakerExportBar filteredOfftakers={filtered} allOfftakers={offtakers} selected={selected} insightStatus={insightStatus} />
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
