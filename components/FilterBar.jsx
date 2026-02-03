'use client';

import { useState, useRef, useEffect } from 'react';

export default function FilterBar({ filters, setFilters, geographies }) {
  const [geoOpen, setGeoOpen] = useState(false);
  const geoRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (geoRef.current && !geoRef.current.contains(e.target)) setGeoOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleGeo = (geo) => {
    setFilters((f) => {
      const set = new Set(f.geographies);
      if (set.has(geo)) set.delete(geo);
      else set.add(geo);
      return { ...f, geographies: [...set] };
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Search */}
      <input
        type="text"
        placeholder="Search name, parent, commentary..."
        value={filters.search}
        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        className="border border-gray-300 rounded px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Tier */}
      <select
        value={filters.tier}
        onChange={(e) => setFilters((f) => ({ ...f, tier: e.target.value }))}
        className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Tiers</option>
        <option value="1">Tier 1</option>
        <option value="2">Tier 2</option>
        <option value="3">Tier 3</option>
      </select>

      {/* Type */}
      <select
        value={filters.type}
        onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
        className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Types</option>
        <option value="Strategic">Strategic</option>
        <option value="Financial">Financial</option>
      </select>

      {/* Geography multi-select */}
      <div className="relative" ref={geoRef}>
        <button
          onClick={() => setGeoOpen(!geoOpen)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Geography
          {filters.geographies.length > 0 && (
            <span className="bg-blue-600 text-white rounded-full text-xs px-1.5 ml-1">
              {filters.geographies.length}
            </span>
          )}
          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {geoOpen && (
          <div className="absolute z-50 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto w-56">
            {filters.geographies.length > 0 && (
              <button
                onClick={() => setFilters((f) => ({ ...f, geographies: [] }))}
                className="w-full text-left px-3 py-1 text-xs text-blue-600 hover:bg-gray-50 border-b"
              >
                Clear all
              </button>
            )}
            {geographies.map((geo) => (
              <label
                key={geo}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={filters.geographies.includes(geo)}
                  onChange={() => toggleGeo(geo)}
                  className="rounded"
                />
                {geo}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Clear all filters */}
      {(filters.search || filters.tier || filters.type || filters.geographies.length > 0) && (
        <button
          onClick={() => setFilters({ search: '', tier: '', type: '', geographies: [] })}
          className="text-sm text-gray-500 hover:text-gray-800 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
