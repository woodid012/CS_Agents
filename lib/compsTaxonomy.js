// ─────────────────────────────────────────────────────────────────────────
// Comps research taxonomy
//
// This file IS the "schema" for the curated cross-deal comps. The database
// stores observations in a flexible tall (entity–attribute–value) shape — see
// comp_deals / comp_metrics in schema.sql — and this taxonomy gives those rows
// meaning: the canonical set of categories, metric keys, default units and the
// "basis" (total vs per-unit vs %) each metric is normally quoted on.
//
// Adding a new comp type = adding a metric here. No DB migration required.
// The /comps UI and the seed script both read from this file, so keep it as the
// single source of truth.
// ─────────────────────────────────────────────────────────────────────────

// Units a value can be expressed in.
export const UNITS = [
  '$bn', '$m', '$k', '$',                 // absolute money
  '$/MW', '$/MWh', '$/kW', '$/kWh', '$/W', // money per capacity
  '$/MW/yr', '$/kW/yr', '$/yr',            // money per period
  '$/ha', '$/ha/yr',                       // land
  '%', 'x', 'years', 'year', 'hours', 'MW', 'MWh', 'MWac', 'MWdc', 'ha', 'ratio', 'km',
];

// How a value should be interpreted / normalised.
export const BASES = [
  'total',      // a deal-level absolute (e.g. EV $m, total capex $m)
  'per_mw',     // already normalised per MW
  'per_mwh',    // already normalised per MWh
  'per_kw',     // already normalised per kW
  'per_mw_yr',  // recurring per MW per year (rent, opex, community)
  'per_annum',  // recurring per year (deal-level)
  'one_off',    // one-off charge (e.g. system strength connection works)
  'percent',    // share of something (e.g. % of capex, contracted %)
  'multiple',   // a ratio multiple (e.g. EV/EBITDA x)
  'ratio',      // dimensionless ratio (e.g. DC/AC)
  'count',      // a count / tenor (years)
];

// Category → metric definitions. `defaultUnit` / `defaultBasis` pre-fill the
// add form; users can override per observation.
export const COMP_CATEGORIES = [
  {
    key: 'valuation',
    label: 'Valuation',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    metrics: [
      { key: 'enterprise_value',  label: 'Enterprise value (EV)',  defaultUnit: '$m',     defaultBasis: 'total' },
      { key: 'equity_value',      label: 'Equity value',           defaultUnit: '$m',     defaultBasis: 'total' },
      { key: 'ev_per_mw',         label: 'EV / MW',                defaultUnit: '$/MW',   defaultBasis: 'per_mw' },
      { key: 'ev_per_mwh',        label: 'EV / MWh',               defaultUnit: '$/MWh',  defaultBasis: 'per_mwh' },
      { key: 'ev_ebitda',         label: 'EV / EBITDA',            defaultUnit: 'x',      defaultBasis: 'multiple' },
      { key: 'price_per_w',       label: 'Implied $/W',            defaultUnit: '$/W',    defaultBasis: 'per_kw' },
    ],
  },
  {
    key: 'capex',
    label: 'Capex',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    metrics: [
      { key: 'capex_total',   label: 'Total capex',     defaultUnit: '$m',    defaultBasis: 'total' },
      { key: 'capex_per_mw',  label: 'Capex / MW',      defaultUnit: '$/MW',  defaultBasis: 'per_mw' },
      { key: 'capex_per_mwh', label: 'Capex / MWh',     defaultUnit: '$/MWh', defaultBasis: 'per_mwh' },
      { key: 'devex',         label: 'Development cost', defaultUnit: '$m',   defaultBasis: 'total' },
    ],
  },
  {
    key: 'capex_split',
    label: 'Capex split (AC/DC/EPC)',
    color: 'bg-teal-50 text-teal-700 border-teal-200',
    metrics: [
      { key: 'epc_cost',       label: 'EPC cost',                 defaultUnit: '$/MW',  defaultBasis: 'per_mw' },
      { key: 'ac_cost',        label: 'AC works (BoP/electrical)', defaultUnit: '$/MW', defaultBasis: 'per_mw' },
      { key: 'dc_cost',        label: 'DC works (modules+array)', defaultUnit: '$/MW',  defaultBasis: 'per_mw' },
      { key: 'module_cost',    label: 'PV modules',               defaultUnit: '$/W',   defaultBasis: 'per_kw' },
      { key: 'inverter_cost',  label: 'Inverters / PCS',          defaultUnit: '$/MW',  defaultBasis: 'per_mw' },
      { key: 'bess_pack_cost', label: 'Battery packs',            defaultUnit: '$/MWh', defaultBasis: 'per_mwh' },
      { key: 'civil_cost',     label: 'Civil / BoP',              defaultUnit: '$/MW',  defaultBasis: 'per_mw' },
      { key: 'epc_pct',        label: 'EPC % of total capex',     defaultUnit: '%',     defaultBasis: 'percent' },
    ],
  },
  {
    key: 'connection',
    label: 'Connection & network',
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    metrics: [
      { key: 'connection_cost',        label: 'Connection / grid cost',   defaultUnit: '$m',     defaultBasis: 'total' },
      { key: 'connection_per_mw',      label: 'Connection / MW',          defaultUnit: '$/MW',   defaultBasis: 'per_mw' },
      { key: 'system_strength_charge', label: 'System strength charge',   defaultUnit: '$m',     defaultBasis: 'one_off' },
      { key: 'system_strength_per_mw', label: 'System strength / MW',     defaultUnit: '$/MW',   defaultBasis: 'per_mw' },
      { key: 'network_aug',            label: 'Network augmentation',     defaultUnit: '$m',     defaultBasis: 'total' },
      { key: 'tuos_duos',              label: 'TUOS / DUOS charges',      defaultUnit: '$/MW/yr', defaultBasis: 'per_mw_yr' },
      { key: 'mlf',                    label: 'Marginal loss factor (MLF)', defaultUnit: 'ratio', defaultBasis: 'ratio' },
      { key: 'transmission_capex',     label: 'Transmission project cost', defaultUnit: '$m',    defaultBasis: 'total' },
    ],
  },
  {
    key: 'opex',
    label: 'Opex',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    metrics: [
      { key: 'opex_total',     label: 'Total opex (annual)',     defaultUnit: '$/yr',     defaultBasis: 'per_annum' },
      { key: 'opex_per_mw_yr', label: 'Opex / MW / yr',          defaultUnit: '$/MW/yr',  defaultBasis: 'per_mw_yr' },
      { key: 'o_and_m',        label: 'O&M / LTSA',              defaultUnit: '$/MW/yr',  defaultBasis: 'per_mw_yr' },
      { key: 'asset_mgmt',     label: 'Asset management',        defaultUnit: '$/MW/yr',  defaultBasis: 'per_mw_yr' },
      { key: 'insurance',      label: 'Insurance',               defaultUnit: '$/MW/yr',  defaultBasis: 'per_mw_yr' },
    ],
  },
  {
    key: 'land',
    label: 'Land & rent',
    color: 'bg-lime-50 text-lime-700 border-lime-200',
    metrics: [
      { key: 'land_area',      label: 'Land area',          defaultUnit: 'ha',      defaultBasis: 'total' },
      { key: 'land_cost',      label: 'Land acquisition',   defaultUnit: '$m',      defaultBasis: 'total' },
      { key: 'rent_per_mw_yr', label: 'Rent / MW / yr',     defaultUnit: '$/MW/yr', defaultBasis: 'per_mw_yr' },
      { key: 'rent_per_ha_yr', label: 'Rent / ha / yr',     defaultUnit: '$/ha/yr', defaultBasis: 'per_mw_yr' },
      { key: 'rent_total',     label: 'Rent (annual total)', defaultUnit: '$/yr',   defaultBasis: 'per_annum' },
    ],
  },
  {
    key: 'community',
    label: 'Community contributions',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    metrics: [
      { key: 'community_per_mw_yr', label: 'Community fund / MW / yr', defaultUnit: '$/MW/yr', defaultBasis: 'per_mw_yr' },
      { key: 'community_per_mwh_yr', label: 'Community fund / MWh / yr', defaultUnit: '$/MWh', defaultBasis: 'per_mw_yr' },
      { key: 'community_total',     label: 'Community fund (annual)',  defaultUnit: '$/yr',    defaultBasis: 'per_annum' },
      { key: 'benefit_sharing',     label: 'Benefit-sharing commitment', defaultUnit: '$m',   defaultBasis: 'total' },
    ],
  },
  {
    key: 'offtake',
    label: 'Offtake / PPA',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    metrics: [
      { key: 'ppa_price',      label: 'PPA / offtake price', defaultUnit: '$/MWh', defaultBasis: 'per_mwh' },
      { key: 'ppa_tenor',      label: 'PPA term',            defaultUnit: 'years', defaultBasis: 'count' },
      { key: 'ppa_start_year', label: 'PPA start year',      defaultUnit: 'year',  defaultBasis: 'count' },
      { key: 'contracted_pct', label: 'Contracted volume',   defaultUnit: '%',     defaultBasis: 'percent' },
    ],
  },
  {
    key: 'financing',
    label: 'Financing / debt',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    metrics: [
      { key: 'debt_total',     label: 'Debt raised',        defaultUnit: '$m',    defaultBasis: 'total' },
      { key: 'debt_per_mw',    label: 'Debt / MW',          defaultUnit: '$/MW',  defaultBasis: 'per_mw' },
      { key: 'debt_per_mwh',   label: 'Debt / MWh',         defaultUnit: '$/MWh', defaultBasis: 'per_mwh' },
      { key: 'equity_raised',  label: 'Equity raised',      defaultUnit: '$m',    defaultBasis: 'total' },
      { key: 'gearing',        label: 'Gearing (debt %)',   defaultUnit: '%',     defaultBasis: 'percent' },
      { key: 'debt_tenor',     label: 'Debt tenor',         defaultUnit: 'years', defaultBasis: 'count' },
      { key: 'total_project_cost', label: 'Total project cost', defaultUnit: '$m', defaultBasis: 'total' },
    ],
  },
  {
    key: 'returns',
    label: 'Returns',
    color: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    metrics: [
      { key: 'equity_irr',  label: 'Equity IRR',  defaultUnit: '%', defaultBasis: 'percent' },
      { key: 'project_irr', label: 'Project IRR', defaultUnit: '%', defaultBasis: 'percent' },
    ],
  },
  {
    key: 'performance',
    label: 'Performance',
    color: 'bg-slate-50 text-slate-700 border-slate-200',
    metrics: [
      { key: 'capacity_factor', label: 'Capacity factor',    defaultUnit: '%',     defaultBasis: 'percent' },
      { key: 'dc_ac_ratio',     label: 'DC / AC ratio',      defaultUnit: 'ratio', defaultBasis: 'ratio' },
      { key: 'rte',             label: 'Round-trip efficiency', defaultUnit: '%',  defaultBasis: 'percent' },
      { key: 'duration_hours',  label: 'Storage duration',   defaultUnit: 'hours', defaultBasis: 'count' },
    ],
  },
];

// Deal-level enums (reused by the UI dropdowns).
export const TECHNOLOGIES = [
  'Solar', 'Wind', 'Offshore Wind', 'BESS', 'Solar + BESS', 'Wind + BESS', 'Hybrid',
  'Pumped hydro', 'Transmission', 'Hydrogen', 'Platform', 'Other',
];
export const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT', 'National'];
export const DEAL_TYPES = ['M&A', 'Asset acquisition', 'Platform', 'Development benchmark', 'EPC', 'Offtake', 'CIS award', 'Transmission', 'Refinancing', 'Capital raise'];

// Support schemes — the high-level GROUP a deal belongs to (the comp_deals.scheme
// field). Combines Commonwealth + state programs so awards can be rolled up.
export const SCHEMES = [
  'CISA',                  // Commonwealth Capacity Investment Scheme
  'NSW LTESA',             // NSW Electricity Infrastructure Roadmap (AEMO Services)
  'SA FERM',               // SA Firm Energy Reliability Mechanism
  'VIC VRET',              // Victorian Renewable Energy Target auctions
  'VIC SEC',               // Victorian State Electricity Commission
  'QLD CleanCo',           // Queensland government generator
  'NSW REZ',               // NSW Renewable Energy Zone access schemes
  'Hydrogen Headstart',    // Commonwealth green hydrogen
  'NSW Benefit Sharing',   // NSW planning benefit-sharing guideline
];

// Specific tender rounds / programs within a scheme (the comp_deals.program field).
// Free-text is allowed; these power the form's suggestion list.
export const PROGRAMS = [
  'CIS Tender 1 — NEM Generation',
  'CIS Tender 2 — WEM Dispatchable',
  'CIS Tender 3 — NEM Dispatchable',
  'CIS Tender 4 — NEM Generation',
  'CIS Tender 5 — WEM Generation',
  'CIS Tender 6 — WEM Dispatchable',
  'CIS Tender 7 — NEM Generation',
  'CIS Tender 8 — NEM Dispatchable',
  'NSW LTESA Tender 3 — Gen + LDS',
  'NSW LTESA Tender 4 — Generation',
  'NSW LTESA Tender 5 — Long-Duration Storage',
  'SA FERM Tender 1',
  'VRET (VRET1/VRET2)',
  'SEC',
  'CleanCo',
  'Hydrogen Headstart',
  'NSW Benefit Sharing Guideline',
];
export const STATUSES = ['Announced', 'Completed', 'FID', 'Construction', 'Operating', 'Development', 'Benchmark'];
export const CONFIDENCE = ['High', 'Medium', 'Low', 'Illustrative'];

// ── Flat lookups ──────────────────────────────────────────────────────────
export const CATEGORY_BY_KEY = Object.fromEntries(COMP_CATEGORIES.map((c) => [c.key, c]));

export const METRIC_BY_KEY = Object.fromEntries(
  COMP_CATEGORIES.flatMap((c) => c.metrics.map((m) => [m.key, { ...m, category: c.key, categoryLabel: c.label }]))
);

export function metricLabel(key) {
  return METRIC_BY_KEY[key]?.label || key;
}

export function categoryForMetric(key) {
  return METRIC_BY_KEY[key]?.category || 'other';
}
