// One-off: seed counterparty_news with a batch of real news items found via
// targeted web search across BESS / Solar / Wind / Finance / Deals / Sales /
// Buys themes. Idempotent: skips entries whose (counterparty_id, headline)
// pair already exists.
//
// Run: node scripts/seed-news-batch1.js

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL in .env.local');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

function lookup(cps, name) {
  const ln = name.toLowerCase().trim();
  let hit = cps.find((c) => c.name.toLowerCase().trim() === ln);
  if (hit) return hit;
  hit = cps.find((c) => {
    const cn = c.name.toLowerCase().trim();
    return cn.startsWith(ln + ' ');
  });
  if (hit) return hit;
  // Strict-ish substring (only when name >= 5 chars)
  hit = cps.find((c) => {
    const cn = c.name.toLowerCase().trim();
    return ln.length >= 5 && cn.includes(ln);
  });
  return hit || null;
}

const NEWS = [
  // ─── M&A / Deals ───────────────────────────────────────────────────────
  {
    cp: 'CleanPeak Energy',
    headline: 'CleanPeak acquires Sustainable Energy Infrastructure portfolio (sub-5MW solar + BESS)',
    summary: 'CleanPeak acquired a portfolio of 71 MWac of solar PV across 16 sites and 42 MW of battery storage across 11 sites in NSW, VIC and SA from Sustainable Energy Infrastructure.',
    source: 'Energy-Storage.News',
    published_at: '2026-04-15',
    tags: ['BESS', 'Solar', 'M&A', 'Buys', 'Australia'],
  },
  {
    cp: 'CleanPeak Energy',
    headline: 'CleanPeak buys five solar-plus-BESS sites from Fortitude Renewables',
    summary: 'Five sites with 5MW solar paired with battery storage; development approvals + connection agreements in place. Construction targeted 2026, operations early 2027.',
    source: 'PV Tech',
    published_at: '2026-03-20',
    tags: ['BESS', 'Solar', 'M&A', 'Buys', 'Australia'],
  },
  {
    cp: 'Aula Energy',
    headline: 'Macquarie-backed Aula Energy acquires 1GW Lightsource bp solar portfolio',
    summary: 'Aula Energy bought five operating utility-scale solar farms from Lightsource bp plus a development pipeline of up to 800MW co-located BESS. Portfolio: Wellington (200MW), Wellington North (400MW), West Wyalong (107MW), Woolooga (210MW), Wunghnu (90MW). Aula now Australia\'s second-largest owner of operational utility-scale solar.',
    source: 'PV Magazine',
    published_at: '2026-02-23',
    tags: ['Solar', 'BESS', 'M&A', 'Buys', 'Australia'],
  },
  {
    cp: 'Macquarie',
    headline: 'Macquarie-backed Aula Energy expands platform with 1GW Lightsource bp portfolio',
    summary: 'Aula Energy (a Macquarie Asset Management business) acquires the Lightsource bp 1GW Australian solar portfolio. Reinforces Macquarie\'s GIG strategy of de-risking and consolidating renewable assets.',
    source: 'PV Magazine',
    published_at: '2026-02-23',
    tags: ['Solar', 'BESS', 'M&A', 'Buys', 'Finance'],
  },
  {
    cp: 'Iberdrola',
    headline: 'Iberdrola acquires Ararat wind farm (242MW) from Partners Group and OPTrust',
    summary: 'Spanish utility Iberdrola completes acquisition of the 242MW Ararat wind farm in Victoria — its biggest wind farm in Australia and first owned generation asset in Victoria. Iberdrola plans to invest €1bn in Australia by 2028.',
    source: 'Iberdrola / Energy Global',
    published_at: '2026-03-06',
    tags: ['Wind', 'M&A', 'Buys', 'Australia'],
  },
  {
    cp: 'Partners Group',
    headline: 'Partners Group sells Ararat wind farm (242MW) to Iberdrola',
    summary: 'Partners Group and co-owner OPTrust divested the 242MW Ararat wind farm in Victoria to Iberdrola. Asset operational since 2017.',
    source: 'Iberdrola',
    published_at: '2026-03-06',
    tags: ['Wind', 'M&A', 'Sales', 'Australia'],
  },
  {
    cp: 'OPTrust',
    headline: 'OPTrust exits Ararat wind farm (242MW) in joint sale to Iberdrola',
    summary: 'Canadian pension OPTrust co-divested the 242MW Ararat wind farm in Victoria with Partners Group, sold to Iberdrola.',
    source: 'Iberdrola',
    published_at: '2026-03-06',
    tags: ['Wind', 'M&A', 'Sales', 'Australia'],
  },
  {
    cp: 'Palisade',
    headline: 'Palisade buys 240MW/960MWh Summerfield BESS from Copenhagen Infrastructure Partners',
    summary: 'Palisade Investment Partners acquires the Summerfield BESS in South Australia from CIP. Construction began February 2025; commercial operations scheduled late 2026.',
    source: 'Energy-Storage.News',
    published_at: '2026-02-10',
    tags: ['BESS', 'M&A', 'Buys', 'Australia'],
  },

  // ─── PPAs / Financing ──────────────────────────────────────────────────
  {
    cp: 'Amazon',
    headline: 'Amazon Australia signs 430MW of clean energy PPAs across NSW and VIC',
    summary: 'Nine PPAs adding 430MW; pushes Amazon\'s Australian renewable capacity to ~990MW once operational.',
    source: 'Renewable Watch',
    published_at: '2026-04-20',
    tags: ['Solar', 'Wind', 'Finance', 'PPA', 'Buys', 'Australia'],
  },
  {
    cp: 'Foresight Group',
    headline: 'Foresight\'s Kondinin Wind Farm signs 7-year PPA with Synergy (130MW)',
    summary: 'Synergy will purchase 100% of renewable energy from the proposed 130MW Kondinin wind farm in WA, supporting development and financing.',
    source: 'Foresight',
    published_at: '2026-03-12',
    tags: ['Wind', 'Finance', 'PPA', 'Australia'],
  },

  // ─── BESS deals ────────────────────────────────────────────────────────
  {
    cp: 'Hanwha',
    headline: 'Hanwha pens BESS supply deal for 2.2GWh co-located system in Australia (with Ark Energy)',
    summary: 'Hanwha to supply equipment for a 2.2GWh co-located battery system in Australia in partnership with Ark Energy.',
    source: 'Energy-Storage.News',
    published_at: '2026-04-08',
    tags: ['BESS', 'Deals', 'Solar', 'Australia'],
  },
  {
    cp: 'AMPYR Energy',
    headline: 'Ampyr buys Shell\'s equity in 1GWh Wellington BESS (NSW)',
    summary: 'Ampyr secured Shell\'s remaining stake in the Wellington BESS Stage 1 in NSW; Stage 1 expected to be energised in 2026.',
    source: 'Energy-Storage.News',
    published_at: '2026-03-28',
    tags: ['BESS', 'M&A', 'Buys', 'Australia'],
  },
  {
    cp: 'Shell',
    headline: 'Shell exits Wellington BESS (NSW) — sells equity to Ampyr',
    summary: 'Shell divested its remaining equity in the 1GWh Wellington BESS Stage 1 in NSW to co-developer Ampyr. Stage 1 expected to energise in 2026.',
    source: 'Energy-Storage.News',
    published_at: '2026-03-28',
    tags: ['BESS', 'M&A', 'Sales', 'Australia'],
  },

  // ─── Big-picture / investor ────────────────────────────────────────────
  {
    cp: 'Brookfield',
    headline: 'Brookfield closes record $20B clean energy fund (Global Transition Fund II)',
    summary: 'Brookfield\'s Global Transition Fund II will invest in renewable energy, carbon capture, nuclear and other low-carbon solutions worldwide. 200+ global investors including major pension funds and SWFs. Brookfield 2026 outlook: "once-in-a-generation investment supercycle".',
    source: 'Carbon Credits',
    published_at: '2026-02-18',
    tags: ['Finance', 'Deals', 'Funds'],
  },
  {
    cp: 'Macquarie',
    headline: 'Macquarie projects 10% annual returns in 2026 capex super-cycle for utilities',
    summary: 'Macquarie Asset Management 2026 outlook flags utilities entering a capex super-cycle. Macquarie GIG strategy: enter early-stage transition projects (hydrogen, batteries, offshore wind), de-risk, sell to competitors at premium.',
    source: 'Macquarie',
    published_at: '2026-01-30',
    tags: ['Finance', 'Deals', 'Funds'],
  },

  // ─── Origin / Shell — lost bid ─────────────────────────────────────────
  {
    cp: 'Origin',
    headline: 'Snowy Hydro elbows out Origin and Shell for $1.9bn NSW transport renewable deal',
    summary: 'Snowy Hydro won a $1.9bn renewable power deal for NSW state trains and electric buses, beating bids from Origin Energy and Shell.',
    source: 'RenewEconomy',
    published_at: '2026-04-02',
    tags: ['Wind', 'Solar', 'Deals', 'PPA', 'Australia'],
  },
  {
    cp: 'Shell',
    headline: 'Shell loses out to Snowy Hydro on $1.9bn NSW transport renewable deal',
    summary: 'Snowy Hydro selected over Shell and Origin Energy for $1.9bn renewable power deal supporting NSW trains and electric buses.',
    source: 'RenewEconomy',
    published_at: '2026-04-02',
    tags: ['Wind', 'Solar', 'Deals', 'PPA', 'Australia'],
  },

  // ─── General market (counterparty_id NULL) ─────────────────────────────
  {
    cp: null,
    headline: 'Australia BESS M&A shifts to construction-phase, contracted assets',
    summary: 'Infrastructure capital is increasingly paying for execution-ready storage rather than speculative pipelines. Investors prioritise de-risked storage with stable cash-flow visibility over earlier-stage development exposure.',
    source: 'Megaproject.com',
    published_at: '2026-04-22',
    tags: ['BESS', 'M&A', 'Market', 'Australia'],
  },
  {
    cp: null,
    headline: 'Battery storage claims 46% share of Australia\'s record 64GW energy investment pipeline',
    summary: 'Standalone battery projects represent nearly half of all planned capacity additions. Q1 2025 saw AUD 2.4bn invested in large-scale BESS, adding 1.5GW / 5GWh.',
    source: 'Energy-Storage.News',
    published_at: '2026-04-10',
    tags: ['BESS', 'Market', 'Australia'],
  },
  {
    cp: null,
    headline: 'Victoria offshore wind tender opens August 2026 (initial 2GW)',
    summary: 'Australia\'s first open tender for offshore wind projects, with an initial 2GW capacity. Major opportunity for global developers to enter Australian offshore wind.',
    source: 'Offshore Wind / GWEC',
    published_at: '2026-01-27',
    tags: ['Wind', 'Offshore', 'Tender', 'Australia'],
  },
  {
    cp: null,
    headline: 'Hamilton Locke 2026 forecast: hybrid offtake structures and data-centre PPA demand to surge',
    summary: 'Hybrid offtake agreements (run-of-the-meter, stepped pricing, government-backed) increasingly common. Data centres + AI emerging as prominent demand-side driver in 2026 corporate PPA activity.',
    source: 'Hamilton Locke',
    published_at: '2026-02-05',
    tags: ['Finance', 'PPA', 'Market', 'Data Centres'],
  },
  {
    cp: null,
    headline: 'Renewable projects without batteries may struggle for M&A in 2026',
    summary: 'Growing recognition of batteries\' ability to maximise output and mitigate curtailment. Investors increasingly require co-located storage on new transactions.',
    source: 'Landers / PV Magazine',
    published_at: '2026-03-01',
    tags: ['BESS', 'M&A', 'Market', 'Solar', 'Wind'],
  },
];

(async () => {
  const cps = await sql`SELECT id, name FROM counterparties ORDER BY name`;
  let ok = 0, dup = 0, miss = 0;

  for (const n of NEWS) {
    let cpId = null;
    if (n.cp) {
      const hit = lookup(cps, n.cp);
      if (!hit) {
        console.log('NO MATCH for counterparty:', n.cp, '— skipping news:', n.headline);
        miss++;
        continue;
      }
      cpId = hit.id;
    }

    const existing = await sql`
      SELECT id FROM counterparty_news
      WHERE counterparty_id IS NOT DISTINCT FROM ${cpId}
        AND LOWER(headline) = LOWER(${n.headline})
      LIMIT 1
    `;
    if (existing.length > 0) { dup++; continue; }

    await sql`
      INSERT INTO counterparty_news (counterparty_id, headline, summary, url, source, published_at, tags)
      VALUES (${cpId}, ${n.headline}, ${n.summary}, ${null}, ${n.source}, ${n.published_at}, ${n.tags})
    `;
    ok++;
  }

  console.log(`Inserted: ${ok}, duplicates skipped: ${dup}, unmatched counterparties: ${miss}`);
  const [{ total }] = await sql`SELECT COUNT(*)::int AS total FROM counterparty_news`;
  console.log(`Total counterparty_news rows now: ${total}`);
})().catch((err) => { console.error(err); process.exit(1); });
