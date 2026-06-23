// ─────────────────────────────────────────────────────────────────────────
// Starter comps dataset.
//
// Two kinds of rows, both clearly flagged via `confidence`:
//   1. Real, public M&A / transaction comps — sourced from the major
//      transactions already tracked in data/australia-market.json.
//   2. Development build-cost benchmarks — typical NEM archetypes, flagged
//      "Illustrative". These are placeholders to exercise the schema; replace
//      with real deal data as it is curated/scraped.
//
// Each metric only carries metric/value/unit/basis/source/confidence — its
// category is derived from lib/compsTaxonomy.js so the taxonomy stays the
// single source of truth. Consumed by the /api/comps seed-if-empty step and by
// scripts/seed-comps.js.
// ─────────────────────────────────────────────────────────────────────────

const PUBLIC = 'data/australia-market.json (public M&A)';
const BENCH = 'Illustrative NEM benchmark — verify before use';

export const COMP_DEALS_SEED = [
  // ── Real, public M&A / transaction comps ────────────────────────────────
  {
    name: 'CPP Investments / Neoen Victoria portfolio',
    counterparty: 'CPP Investments',
    seller: 'Neoen (Brookfield)',
    technology: 'Hybrid',
    deal_type: 'Asset acquisition',
    state: 'VIC',
    capacity_mw: 652,
    capacity_mwh: 450,
    status: 'Completed',
    transaction_date: '2025-08-01',
    currency: 'AUD',
    source: PUBLIC,
    confidence: 'High',
    notes: '652 MW incl. Victorian Big Battery (300 MW/450 MWh), Bulgana Wind, Numurkah Solar. Operating-asset comp.',
    metrics: [
      { metric: 'enterprise_value', value: 950, unit: '$m', basis: 'total', source: PUBLIC, confidence: 'High' },
      { metric: 'ev_per_mw', value: 1457000, unit: '$/MW', basis: 'per_mw', source: PUBLIC, confidence: 'Medium', notes: 'EV / 652 MW; blended across wind/solar/BESS.' },
    ],
  },
  {
    name: 'Sembcorp Industries / Alinta Energy',
    counterparty: 'Sembcorp Industries',
    seller: 'Chow Tai Fook Enterprises',
    technology: 'Platform',
    deal_type: 'M&A',
    state: 'National',
    capacity_mw: 3400,
    status: 'Announced',
    transaction_date: '2025-12-11',
    currency: 'AUD',
    source: PUBLIC,
    confidence: 'High',
    notes: '3,400 MW owned/contracted (gas, wind, solar, coal) + 10.4 GW pipeline. Mixed thermal+RE — $/MW not RE-pure. FIRB/ACCC pending.',
    metrics: [
      { metric: 'enterprise_value', value: 6500, unit: '$m', basis: 'total', source: PUBLIC, confidence: 'High' },
      { metric: 'ev_per_mw', value: 1912000, unit: '$/MW', basis: 'per_mw', source: PUBLIC, confidence: 'Low', notes: 'EV / 3,400 MW incl. thermal — directional only.' },
    ],
  },
  {
    name: 'Brookfield / Neoen',
    counterparty: 'Brookfield (with Temasek)',
    seller: 'Neoen public shareholders',
    technology: 'Platform',
    deal_type: 'Platform',
    state: 'National',
    status: 'Completed',
    transaction_date: '2025-04-04',
    currency: 'AUD',
    source: PUBLIC,
    confidence: 'High',
    notes: 'EUR 6.1B (~A$10B) full take-private of Neoen. Global platform (~10 GW target) incl. major AU assets (Hornsdale, VBB).',
    metrics: [
      { metric: 'enterprise_value', value: 10000, unit: '$m', basis: 'total', source: PUBLIC, confidence: 'Medium', notes: 'EUR 6.1B converted ~A$10B; global platform.' },
    ],
  },
  {
    name: 'La Caisse (CDPQ) / Edify Energy',
    counterparty: 'La Caisse (CDPQ)',
    seller: 'Edify Energy',
    technology: 'Solar + BESS',
    deal_type: 'Platform',
    state: 'National',
    status: 'Announced',
    transaction_date: '2025-01-01',
    currency: 'AUD',
    source: PUBLIC,
    confidence: 'Medium',
    notes: '~CAD$1B (A$1.1B+) for developer with 11 GW+ pipeline. Platform/pipeline comp — $/MW not meaningful on pipeline.',
    metrics: [
      { metric: 'enterprise_value', value: 1100, unit: '$m', basis: 'total', source: PUBLIC, confidence: 'Medium' },
    ],
  },
  {
    name: 'Octopus Energy / Hanworth BESS',
    counterparty: 'Octopus Energy Australia (APG-backed)',
    seller: '—',
    technology: 'BESS',
    deal_type: 'Development benchmark',
    state: 'NSW',
    capacity_mw: 1200,
    capacity_mwh: 4800,
    status: 'Development',
    transaction_date: '2025-07-01',
    currency: 'AUD',
    source: PUBLIC,
    confidence: 'Medium',
    notes: "1.2 GW / 4.8 GWh — Australia's largest planned battery. APG committed USD650M to the platform (not a project EV).",
    metrics: [
      { metric: 'duration_hours', value: 4, unit: 'hours', basis: 'count', source: PUBLIC, confidence: 'High', notes: '4.8 GWh / 1.2 GW = 4h duration.' },
    ],
  },

  // ── Development build-cost benchmarks (ILLUSTRATIVE — replace with real data) ──
  {
    name: 'Utility solar — NSW ~200 MWac (benchmark)',
    counterparty: '—',
    technology: 'Solar',
    deal_type: 'Development benchmark',
    state: 'NSW',
    capacity_mw: 200,
    capacity_mwac: 200,
    capacity_mwdc: 270,
    status: 'Benchmark',
    currency: 'AUD',
    source: BENCH,
    confidence: 'Illustrative',
    notes: 'Generic large-scale single-axis tracking solar archetype. Placeholder values to exercise the capex-split / connection / land / community schema.',
    metrics: [
      { metric: 'capex_per_mw', value: 1100000, unit: '$/MW', basis: 'per_mw', source: BENCH, confidence: 'Illustrative' },
      { metric: 'epc_pct', value: 75, unit: '%', basis: 'percent', source: BENCH, confidence: 'Illustrative' },
      { metric: 'dc_cost', value: 450000, unit: '$/MW', basis: 'per_mw', source: BENCH, confidence: 'Illustrative', notes: 'Modules + structures + array.' },
      { metric: 'ac_cost', value: 250000, unit: '$/MW', basis: 'per_mw', source: BENCH, confidence: 'Illustrative', notes: 'Inverters + MV/HV + substation.' },
      { metric: 'module_cost', value: 0.13, unit: '$/W', basis: 'per_kw', source: BENCH, confidence: 'Illustrative' },
      { metric: 'connection_per_mw', value: 120000, unit: '$/MW', basis: 'per_mw', source: BENCH, confidence: 'Illustrative' },
      { metric: 'system_strength_charge', value: 8, unit: '$m', basis: 'one_off', source: BENCH, confidence: 'Illustrative', notes: 'TNSP system strength remediation (one-off).' },
      { metric: 'opex_per_mw_yr', value: 18000, unit: '$/MW/yr', basis: 'per_mw_yr', source: BENCH, confidence: 'Illustrative' },
      { metric: 'land_area', value: 400, unit: 'ha', basis: 'total', source: BENCH, confidence: 'Illustrative' },
      { metric: 'rent_per_mw_yr', value: 5000, unit: '$/MW/yr', basis: 'per_mw_yr', source: BENCH, confidence: 'Illustrative' },
      { metric: 'community_per_mw_yr', value: 1000, unit: '$/MW/yr', basis: 'per_mw_yr', source: BENCH, confidence: 'Illustrative' },
      { metric: 'mlf', value: 0.95, unit: 'ratio', basis: 'ratio', source: BENCH, confidence: 'Illustrative' },
      { metric: 'capacity_factor', value: 28, unit: '%', basis: 'percent', source: BENCH, confidence: 'Illustrative' },
      { metric: 'dc_ac_ratio', value: 1.35, unit: 'ratio', basis: 'ratio', source: BENCH, confidence: 'Illustrative' },
    ],
  },
  {
    name: 'Onshore wind — VIC ~300 MW (benchmark)',
    counterparty: '—',
    technology: 'Wind',
    deal_type: 'Development benchmark',
    state: 'VIC',
    capacity_mw: 300,
    status: 'Benchmark',
    currency: 'AUD',
    source: BENCH,
    confidence: 'Illustrative',
    notes: 'Generic onshore wind archetype. Placeholder values.',
    metrics: [
      { metric: 'capex_per_mw', value: 2400000, unit: '$/MW', basis: 'per_mw', source: BENCH, confidence: 'Illustrative' },
      { metric: 'opex_per_mw_yr', value: 40000, unit: '$/MW/yr', basis: 'per_mw_yr', source: BENCH, confidence: 'Illustrative' },
      { metric: 'connection_per_mw', value: 150000, unit: '$/MW', basis: 'per_mw', source: BENCH, confidence: 'Illustrative' },
      { metric: 'community_per_mw_yr', value: 1500, unit: '$/MW/yr', basis: 'per_mw_yr', source: BENCH, confidence: 'Illustrative', notes: 'Neighbour/community benefit-sharing.' },
      { metric: 'capacity_factor', value: 38, unit: '%', basis: 'percent', source: BENCH, confidence: 'Illustrative' },
    ],
  },
  {
    name: 'Standalone BESS — QLD 100 MW / 200 MWh (benchmark)',
    counterparty: '—',
    technology: 'BESS',
    deal_type: 'Development benchmark',
    state: 'QLD',
    capacity_mw: 100,
    capacity_mwh: 200,
    status: 'Benchmark',
    currency: 'AUD',
    source: BENCH,
    confidence: 'Illustrative',
    notes: 'Generic 2-hour standalone BESS archetype. Placeholder values.',
    metrics: [
      { metric: 'capex_per_mwh', value: 500000, unit: '$/MWh', basis: 'per_mwh', source: BENCH, confidence: 'Illustrative' },
      { metric: 'capex_per_mw', value: 1000000, unit: '$/MW', basis: 'per_mw', source: BENCH, confidence: 'Illustrative', notes: '2h system.' },
      { metric: 'bess_pack_cost', value: 300000, unit: '$/MWh', basis: 'per_mwh', source: BENCH, confidence: 'Illustrative' },
      { metric: 'epc_pct', value: 70, unit: '%', basis: 'percent', source: BENCH, confidence: 'Illustrative' },
      { metric: 'connection_per_mw', value: 100000, unit: '$/MW', basis: 'per_mw', source: BENCH, confidence: 'Illustrative' },
      { metric: 'system_strength_per_mw', value: 50000, unit: '$/MW', basis: 'per_mw', source: BENCH, confidence: 'Illustrative' },
      { metric: 'opex_per_mw_yr', value: 12000, unit: '$/MW/yr', basis: 'per_mw_yr', source: BENCH, confidence: 'Illustrative' },
      { metric: 'rte', value: 87, unit: '%', basis: 'percent', source: BENCH, confidence: 'Illustrative' },
      { metric: 'duration_hours', value: 2, unit: 'hours', basis: 'count', source: BENCH, confidence: 'High' },
    ],
  },
];
