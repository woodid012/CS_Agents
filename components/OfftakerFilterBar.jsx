'use client';

const ARCHETYPES = [
  'IG Grade Gentailers',
  'Corporates',
  'Financial/Trading Houses',
  'Small Retailers',
];

export default function OfftakerFilterBar({ filters, setFilters }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Search */}
      <input
        type="text"
        placeholder="Search name, archetype, contact, notes..."
        value={filters.search}
        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        className="border border-gray-300 rounded px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Archetype */}
      <select
        value={filters.archetype}
        onChange={(e) => setFilters((f) => ({ ...f, archetype: e.target.value }))}
        className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Archetypes</option>
        {ARCHETYPES.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      {/* Conversation Held */}
      <select
        value={filters.convHeld}
        onChange={(e) => setFilters((f) => ({ ...f, convHeld: e.target.value }))}
        className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Conv Held? (All)</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>

      {/* Clear all filters */}
      {(filters.search || filters.archetype || filters.convHeld) && (
        <button
          onClick={() => setFilters({ search: '', archetype: '', convHeld: '' })}
          className="text-sm text-gray-500 hover:text-gray-800 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
