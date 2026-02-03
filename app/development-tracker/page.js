'use client';

import { useState, useMemo } from 'react';
import StageTransitionTracker from '../../components/StageTransitionTracker';

const STAGES = [
  { key: 'announced', label: 'Early Stage / Announced', color: 'bg-slate-500' },
  { key: 'connection', label: 'Connection Application', color: 'bg-amber-500' },
  { key: 'committed', label: 'Committed', color: 'bg-blue-500' },
  { key: 'construction', label: 'Under Construction', color: 'bg-orange-500' },
  { key: 'operating', label: 'Operating', color: 'bg-emerald-500' },
];

const TECH_COLORS = {
  'Solar': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Wind': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'BESS': 'bg-purple-100 text-purple-800 border-purple-200',
  'Solar + BESS': 'bg-orange-100 text-orange-800 border-orange-200',
  'Wind + BESS': 'bg-teal-100 text-teal-800 border-teal-200',
  'Offshore Wind': 'bg-blue-100 text-blue-800 border-blue-200',
};

const MOCK_PROJECTS = [
  // Early Stage / Announced
  { id: 1, name: 'Wallaroo Solar Farm', stage: 'announced', region: 'NSW', tech: 'Solar', capacity: 350, developer: 'European Energy', rez: 'South-West NSW', expectedDate: '2029', source: 'AEMO Gen Info' },
  { id: 2, name: 'Bungala Extension BESS', stage: 'announced', region: 'SA', tech: 'BESS', capacity: 200, developer: 'Potentia Energy', rez: 'Riverland', expectedDate: '2028', source: 'AEMO Gen Info' },
  { id: 3, name: 'Collinsville Wind Farm', stage: 'announced', region: 'QLD', tech: 'Wind', capacity: 450, developer: 'Squadron Energy', rez: 'North QLD', expectedDate: '2029', source: 'AEMO Gen Info' },
  { id: 4, name: 'Illawarra Offshore Wind', stage: 'announced', region: 'NSW', tech: 'Offshore Wind', capacity: 1200, developer: 'Orsted', rez: 'Illawarra', expectedDate: '2032', source: 'AEMO Gen Info' },
  { id: 5, name: 'Gippsland Offshore Wind', stage: 'announced', region: 'VIC', tech: 'Offshore Wind', capacity: 2000, developer: 'GIP/Vena Energy', rez: 'Gippsland', expectedDate: '2033', source: 'AEMO Gen Info' },
  { id: 6, name: 'Darling Downs Solar Hub', stage: 'announced', region: 'QLD', tech: 'Solar + BESS', capacity: 600, developer: 'FRV', rez: 'Darling Downs', expectedDate: '2028', source: 'AEMO Gen Info' },
  { id: 7, name: 'Tablelands Wind Farm', stage: 'announced', region: 'QLD', tech: 'Wind', capacity: 280, developer: 'AMPYR Energy', rez: 'North QLD', expectedDate: '2029', source: 'AEMO Gen Info' },
  { id: 8, name: 'Murray River Solar', stage: 'announced', region: 'VIC', tech: 'Solar', capacity: 420, developer: 'OX2', rez: 'Murray River', expectedDate: '2028', source: 'AEMO Gen Info' },
  { id: 9, name: 'Hunter Valley BESS', stage: 'announced', region: 'NSW', tech: 'BESS', capacity: 500, developer: 'Akaysha/BlackRock', rez: 'Hunter-Central Coast', expectedDate: '2027', source: 'AEMO Gen Info' },
  { id: 10, name: 'Cape Hardy H2 Hub', stage: 'announced', region: 'SA', tech: 'Wind + BESS', capacity: 1000, developer: 'Carlyle/Revera', rez: 'N/A', expectedDate: '2030', source: 'AEMO Gen Info' },

  // Connection Application
  { id: 11, name: 'Bulli Creek Solar Stage 1', stage: 'connection', region: 'QLD', tech: 'Solar', capacity: 775, developer: 'J-Power/Genex', rez: 'Darling Downs', expectedDate: '2027', source: 'AEMO KCI' },
  { id: 12, name: 'Punchs Creek Solar + BESS', stage: 'connection', region: 'QLD', tech: 'Solar + BESS', capacity: 880, developer: 'EDP/QIC', rez: 'Darling Downs', expectedDate: '2027', source: 'AEMO KCI' },
  { id: 13, name: 'Muswellbrook Solar + BESS', stage: 'connection', region: 'NSW', tech: 'Solar + BESS', capacity: 135, developer: 'OX2', rez: 'Hunter-Central Coast', expectedDate: '2027', source: 'AEMO KCI' },
  { id: 14, name: 'Bellambi Heights BESS', stage: 'connection', region: 'NSW', tech: 'BESS', capacity: 408, developer: 'Vena Energy/GIP', rez: 'Illawarra', expectedDate: '2027', source: 'AEMO KCI' },
  { id: 15, name: 'Belhaven BESS', stage: 'connection', region: 'NSW', tech: 'BESS', capacity: 400, developer: 'Vena Energy/GIP', rez: 'Central-West Orana', expectedDate: '2027', source: 'AEMO KCI' },
  { id: 16, name: 'Willogoleche 2 Wind', stage: 'connection', region: 'SA', tech: 'Wind', capacity: 108, developer: 'Engie', rez: 'Mid-North SA', expectedDate: '2028', source: 'AEMO KCI' },

  // Committed
  { id: 17, name: 'Orana BESS', stage: 'committed', region: 'NSW', tech: 'BESS', capacity: 415, developer: 'Akaysha/BlackRock', rez: 'Central-West Orana', expectedDate: '2026', source: 'AEMO Gen Info' },
  { id: 18, name: 'Bungama Battery Stage 1', stage: 'committed', region: 'SA', tech: 'BESS', capacity: 250, developer: 'Carlyle/Revera', rez: 'Mid-North SA', expectedDate: '2026', source: 'AEMO Gen Info' },
  { id: 19, name: 'Merredin BESS', stage: 'committed', region: 'WA', tech: 'BESS', capacity: 100, developer: 'Igneo/Atmos', rez: 'N/A (SWIS)', expectedDate: '2026', source: 'AEMO Gen Info' },
  { id: 20, name: 'Smithfield Battery', stage: 'committed', region: 'NSW', tech: 'BESS', capacity: 65, developer: 'Iberdrola', rez: 'Sydney', expectedDate: '2026', source: 'AEMO Gen Info' },
  { id: 21, name: 'QLD Battery (Iberdrola)', stage: 'committed', region: 'QLD', tech: 'BESS', capacity: 180, developer: 'Iberdrola', rez: 'South QLD', expectedDate: '2026', source: 'AEMO Gen Info' },
  { id: 22, name: 'Wellington BESS', stage: 'committed', region: 'NSW', tech: 'BESS', capacity: 500, developer: 'AMPYR Energy', rez: 'Central-West Orana', expectedDate: '2026', source: 'AEMO Gen Info' },

  // Under Construction
  { id: 23, name: 'Clarke Creek Wind Farm', stage: 'construction', region: 'QLD', tech: 'Wind', capacity: 450, developer: 'Squadron Energy', rez: 'Fitzroy', expectedDate: '2026', source: 'OpenNEM' },
  { id: 24, name: 'Limestone Coast North BESS', stage: 'construction', region: 'SA', tech: 'BESS', capacity: 250, developer: 'Palisade/Intera', rez: 'South East SA', expectedDate: '2027', source: 'OpenNEM' },
  { id: 25, name: 'Kidston Stage 3 Wind', stage: 'construction', region: 'QLD', tech: 'Wind', capacity: 200, developer: 'J-Power/Genex', rez: 'North QLD', expectedDate: '2026', source: 'OpenNEM' },
  { id: 26, name: 'Octopus Hybrid Solar+BESS', stage: 'construction', region: 'NSW', tech: 'Solar + BESS', capacity: 486, developer: 'Octopus/APG', rez: 'Central-West Orana', expectedDate: '2026', source: 'OpenNEM' },

  // Operating (recent commissions)
  { id: 27, name: 'Victorian Big Battery', stage: 'operating', region: 'VIC', tech: 'BESS', capacity: 350, developer: 'HMC Capital (ex-Neoen)', rez: 'Western Vic', expectedDate: '2024', source: 'OpenNEM' },
  { id: 28, name: 'Bulgana Wind Farm + BESS', stage: 'operating', region: 'VIC', tech: 'Wind + BESS', capacity: 244, developer: 'HMC Capital (ex-Neoen)', rez: 'Western Vic', expectedDate: '2020', source: 'OpenNEM' },
  { id: 29, name: 'Numurkah Solar Farm', stage: 'operating', region: 'VIC', tech: 'Solar', capacity: 128, developer: 'HMC Capital (ex-Neoen)', rez: 'Murray River', expectedDate: '2019', source: 'OpenNEM' },
  { id: 30, name: 'Wandoan South Solar + BESS', stage: 'operating', region: 'QLD', tech: 'Solar + BESS', capacity: 275, developer: 'Vena Energy/GIP', rez: 'Darling Downs', expectedDate: '2023', source: 'OpenNEM' },
  { id: 31, name: 'Hornsdale Wind Farm', stage: 'operating', region: 'SA', tech: 'Wind', capacity: 316, developer: 'Igneo/Atmos', rez: 'Mid-North SA', expectedDate: '2017', source: 'OpenNEM' },
  { id: 32, name: 'Edify Darlington Point Solar', stage: 'operating', region: 'NSW', tech: 'Solar', capacity: 333, developer: 'CDPQ/Edify', rez: 'South-West NSW', expectedDate: '2020', source: 'OpenNEM' },
];

function StageColumn({ stage, projects, viewMode }) {
  const totalMW = projects.reduce((s, p) => s + p.capacity, 0);
  return (
    <div className="flex flex-col min-w-[240px] max-w-[280px]">
      <div className={`${stage.color} text-white rounded-t-lg px-3 py-2`}>
        <div className="font-semibold text-sm">{stage.label}</div>
        <div className="text-xs opacity-90">{projects.length} projects &middot; {totalMW.toLocaleString()} MW</div>
      </div>
      <div className="bg-gray-50 border border-t-0 border-gray-200 rounded-b-lg p-2 space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} viewMode={viewMode} />
        ))}
        {projects.length === 0 && (
          <div className="text-center text-gray-400 text-xs py-4">No projects</div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project: p, viewMode }) {
  const techClass = TECH_COLORS[p.tech] || 'bg-gray-100 text-gray-700 border-gray-200';

  if (viewMode === 'compact') {
    return (
      <div className="bg-white rounded border border-gray-200 px-2.5 py-2 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between gap-1">
          <span className="text-xs font-semibold text-gray-800 leading-tight">{p.name}</span>
          <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">{p.capacity} MW</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold border ${techClass}`}>{p.tech}</span>
          <span className="text-[10px] text-gray-400">{p.region}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <span className="text-xs font-semibold text-gray-800 leading-tight">{p.name}</span>
        <span className="text-sm font-bold text-gray-700 whitespace-nowrap">{p.capacity} MW</span>
      </div>
      <div className="flex flex-wrap items-center gap-1 mb-1.5">
        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold border ${techClass}`}>{p.tech}</span>
        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-600 border border-gray-200">{p.region}</span>
        {p.rez && p.rez !== 'N/A' && p.rez !== 'N/A (SWIS)' && (
          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] text-gray-500 bg-gray-50 border border-gray-100">{p.rez}</span>
        )}
      </div>
      <div className="text-[10px] text-gray-500 space-y-0.5">
        <div><span className="font-medium text-gray-600">Developer:</span> {p.developer}</div>
        <div><span className="font-medium text-gray-600">Expected:</span> {p.expectedDate}</div>
        <div className="text-gray-400">Source: {p.source}</div>
      </div>
    </div>
  );
}

export default function DevelopmentTracker() {
  const [filterRegion, setFilterRegion] = useState('');
  const [filterTech, setFilterTech] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('detailed');

  const regions = [...new Set(MOCK_PROJECTS.map((p) => p.region))].sort();
  const techs = [...new Set(MOCK_PROJECTS.map((p) => p.tech))].sort();

  const filtered = useMemo(() => {
    return MOCK_PROJECTS.filter((p) => {
      if (filterRegion && p.region !== filterRegion) return false;
      if (filterTech && p.tech !== filterTech) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [p.name, p.developer, p.rez, p.region, p.tech].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filterRegion, filterTech, search]);

  const totalMW = filtered.reduce((s, p) => s + p.capacity, 0);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-700">
          Development Pipeline Tracker
          <span className="ml-2 text-sm font-normal text-gray-500">
            {filtered.length} projects &middot; {totalMW.toLocaleString()} MW total
          </span>
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Tracks projects from Announcement through to Operating. Sources: AEMO Generation Information, KCI Register, OpenNEM.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search project, developer, REZ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Regions</option>
          {regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={filterTech}
          onChange={(e) => setFilterTech(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Technologies</option>
          {techs.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex border border-gray-300 rounded overflow-hidden">
          <button
            onClick={() => setViewMode('compact')}
            className={`px-3 py-1.5 text-xs font-medium ${viewMode === 'compact' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Compact
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-3 py-1.5 text-xs font-medium ${viewMode === 'detailed' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Detailed
          </button>
        </div>
        {(search || filterRegion || filterTech) && (
          <button
            onClick={() => { setSearch(''); setFilterRegion(''); setFilterTech(''); }}
            className="text-sm text-gray-500 hover:text-gray-800 underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Summary bar */}
      <div className="flex gap-3 mb-4">
        {STAGES.map((stage) => {
          const count = filtered.filter((p) => p.stage === stage.key).length;
          const mw = filtered.filter((p) => p.stage === stage.key).reduce((s, p) => s + p.capacity, 0);
          return (
            <div key={stage.key} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
              <div>
                <div className="text-[11px] font-semibold text-gray-700">{stage.label}</div>
                <div className="text-[10px] text-gray-400">{count} projects &middot; {mw.toLocaleString()} MW</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline Chart */}
      <StageTransitionTracker />

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <StageColumn
            key={stage.key}
            stage={stage}
            projects={filtered.filter((p) => p.stage === stage.key)}
            viewMode={viewMode}
          />
        ))}
      </div>
    </div>
  );
}
