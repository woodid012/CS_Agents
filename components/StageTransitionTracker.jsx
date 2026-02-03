'use client';

// Mock transition data for the last 12 months (Q4 2024 – Q3 2025)
// In production this would be computed by comparing quarterly AEMO snapshots
const LAST_12_MONTHS = [
  // Q4 2024
  { quarter: 'Q4 2024', from: 'announced', to: 'connection', count: 9, mw: 2800 },
  { quarter: 'Q4 2024', from: 'connection', to: 'committed', count: 6, mw: 2200 },
  { quarter: 'Q4 2024', from: 'committed', to: 'construction', count: 4, mw: 1500 },
  { quarter: 'Q4 2024', from: 'construction', to: 'operating', count: 5, mw: 1800 },
  { quarter: 'Q4 2024', from: 'committed', to: 'withdrawn', count: 1, mw: 200 },
  // Q1 2025
  { quarter: 'Q1 2025', from: 'announced', to: 'connection', count: 7, mw: 2400 },
  { quarter: 'Q1 2025', from: 'connection', to: 'committed', count: 4, mw: 1400 },
  { quarter: 'Q1 2025', from: 'committed', to: 'construction', count: 3, mw: 1100 },
  { quarter: 'Q1 2025', from: 'construction', to: 'operating', count: 6, mw: 2200 },
  { quarter: 'Q1 2025', from: 'announced', to: 'withdrawn', count: 4, mw: 1200 },
  // Q2 2025
  { quarter: 'Q2 2025', from: 'announced', to: 'connection', count: 10, mw: 3800 },
  { quarter: 'Q2 2025', from: 'connection', to: 'committed', count: 5, mw: 1900 },
  { quarter: 'Q2 2025', from: 'committed', to: 'construction', count: 4, mw: 1600 },
  { quarter: 'Q2 2025', from: 'construction', to: 'operating', count: 3, mw: 950 },
  { quarter: 'Q2 2025', from: 'connection', to: 'withdrawn', count: 3, mw: 900 },
  // Q3 2025
  { quarter: 'Q3 2025', from: 'announced', to: 'connection', count: 8, mw: 2600 },
  { quarter: 'Q3 2025', from: 'connection', to: 'committed', count: 7, mw: 2800 },
  { quarter: 'Q3 2025', from: 'committed', to: 'construction', count: 3, mw: 1200 },
  { quarter: 'Q3 2025', from: 'construction', to: 'operating', count: 4, mw: 1500 },
  { quarter: 'Q3 2025', from: 'announced', to: 'withdrawn', count: 6, mw: 2000 },
];

const TRANSITIONS = [
  { from: 'announced', to: 'connection', label: 'Announced', arrow: 'Connection App', color: 'amber' },
  { from: 'connection', to: 'committed', label: 'Connection App', arrow: 'Committed', color: 'blue' },
  { from: 'committed', to: 'construction', label: 'Committed', arrow: 'Construction', color: 'orange' },
  { from: 'construction', to: 'operating', label: 'Construction', arrow: 'Operating', color: 'emerald' },
];

const COLOR_MAP = {
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', accent: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', bar: 'bg-blue-400' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', accent: 'text-orange-600', badge: 'bg-orange-100 text-orange-700', bar: 'bg-orange-400' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-400' },
};

export default function StageTransitionTracker() {
  // Compute last 12 months summary per transition
  const summaries = TRANSITIONS.map((t) => {
    const matches = LAST_12_MONTHS.filter((d) => d.from === t.from && d.to === t.to);
    const count = matches.reduce((s, d) => s + d.count, 0);
    const mw = matches.reduce((s, d) => s + d.mw, 0);

    // Withdrawals from this stage
    const withdrawn = LAST_12_MONTHS.filter((d) => d.from === t.from && d.to === 'withdrawn');
    const wCount = withdrawn.reduce((s, d) => s + d.count, 0);
    const wMW = withdrawn.reduce((s, d) => s + d.mw, 0);

    const totalOut = count + wCount;
    const convRate = totalOut > 0 ? Math.round((count / totalOut) * 100) : 0;

    // Quarterly breakdown for mini sparkline
    const quarters = ['Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025'];
    const qData = quarters.map((q) => {
      const m = matches.find((d) => d.quarter === q);
      return { quarter: q, count: m ? m.count : 0, mw: m ? m.mw : 0 };
    });

    return { ...t, count, mw, wCount, wMW, convRate, qData };
  });

  // Total withdrawn across all stages
  const totalWithdrawn = LAST_12_MONTHS.filter((d) => d.to === 'withdrawn');
  const totalWCount = totalWithdrawn.reduce((s, d) => s + d.count, 0);
  const totalWMW = totalWithdrawn.reduce((s, d) => s + d.mw, 0);

  // Total advanced (all forward transitions)
  const totalAdvCount = summaries.reduce((s, t) => s + t.count, 0);
  const totalAdvMW = summaries.reduce((s, t) => s + t.mw, 0);

  const maxQMW = Math.max(...summaries.flatMap((s) => s.qData.map((q) => q.mw)), 1);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Stage Transitions — Last 12 Months</h3>
          <p className="text-[10px] text-gray-400">
            Q4 2024 – Q3 2025 &middot; Projects that moved between pipeline stages (mock AEMO data)
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <div className="text-center">
            <div className="font-bold text-gray-800">{totalAdvCount}</div>
            <div className="text-[10px] text-gray-400">Advanced</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-gray-800">{totalAdvMW.toLocaleString()} MW</div>
            <div className="text-[10px] text-gray-400">Capacity</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-red-500">{totalWCount}</div>
            <div className="text-[10px] text-red-300">Withdrawn</div>
          </div>
        </div>
      </div>

      {/* Summary Boxes */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        {summaries.map((s) => {
          const c = COLOR_MAP[s.color];
          return (
            <div key={`${s.from}-${s.to}`} className={`${c.bg} border ${c.border} rounded-lg p-3`}>
              {/* Header */}
              <div className="flex items-center gap-1 mb-2">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${c.badge}`}>
                  {s.label}
                </span>
                <svg className="w-3 h-3 text-gray-300 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${c.badge}`}>
                  {s.arrow}
                </span>
              </div>

              {/* Main stats */}
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-xl font-bold ${c.accent}`}>{s.count}</span>
                <span className="text-[10px] text-gray-500">projects</span>
              </div>
              <div className="text-xs text-gray-600 font-semibold mb-2">
                {s.mw.toLocaleString()} MW
              </div>

              {/* Conversion rate */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${c.bar} rounded-full`}
                    style={{ width: `${s.convRate}%` }}
                  />
                </div>
                <span className={`text-[11px] font-bold ${s.convRate >= 70 ? 'text-green-600' : s.convRate >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                  {s.convRate}%
                </span>
              </div>

              {/* Mini quarterly bars */}
              <div className="flex items-end gap-1 h-8">
                {s.qData.map((q) => (
                  <div key={q.quarter} className="flex-1 flex flex-col items-center">
                    <div
                      className={`w-full ${c.bar} rounded-sm opacity-70`}
                      style={{ height: `${maxQMW > 0 ? (q.mw / maxQMW) * 28 : 0}px`, minHeight: q.mw > 0 ? 2 : 0 }}
                      title={`${q.quarter}: ${q.count} projects, ${q.mw.toLocaleString()} MW`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-1 mt-0.5">
                {s.qData.map((q) => (
                  <div key={q.quarter} className="flex-1 text-center text-[8px] text-gray-400">
                    {q.quarter.replace(' 20', "'")}
                  </div>
                ))}
              </div>

              {/* Withdrawn */}
              {s.wCount > 0 && (
                <div className="mt-1.5 text-[10px] text-red-400">
                  {s.wCount} withdrawn ({s.wMW.toLocaleString()} MW)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Withdrawn summary box */}
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-600">Withdrawn</span>
          <span className="text-xs text-gray-600">Total projects that exited the pipeline in the last 12 months</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <span className="text-sm font-bold text-red-500">{totalWCount}</span>
            <span className="text-[10px] text-red-300 ml-1">projects</span>
          </div>
          <div className="text-center">
            <span className="text-sm font-bold text-red-500">{totalWMW.toLocaleString()}</span>
            <span className="text-[10px] text-red-300 ml-1">MW</span>
          </div>
        </div>
      </div>
    </div>
  );
}
