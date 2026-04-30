// Second batch of counterparty news, covering the last 6 months (~Nov 2025 –
// Apr 2026). Sourced from targeted web searches across CIS tenders, AGL/Tilt
// transactions, Quinbrook, Octopus, Rio/BHP/Fortescue PPAs, and similar.
//
// Idempotent on (counterparty_id, headline). Run: node scripts/seed-news-batch2.js

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
  hit = cps.find((c) => c.name.toLowerCase().trim().startsWith(ln + ' '));
  if (hit) return hit;
  hit = cps.find((c) => ln.length >= 5 && c.name.toLowerCase().includes(ln));
  return hit || null;
}

const NEWS = [
  // ─── AGL / Tilt / QIC / Future Fund ────────────────────────────────────
  {
    cp: 'AGL',
    headline: 'AGL sells 19.9% Tilt Renewables stake to QIC and Future Fund for A$750m',
    summary: 'AGL divested most of its 20% holding in Tilt Renewables to a QIC-led consortium that includes Future Fund. AGL will redeploy the proceeds to focus on batteries and peaking gas. The deal kicks off a new strategic partnership where Tilt underwrites new renewable PPAs back to AGL.',
    source: 'Capital Brief / RenewEconomy',
    published_at: '2025-11-15',
    tags: ['Solar', 'Wind', 'M&A', 'Sells', 'Finance', 'Australia'],
  },
  {
    cp: 'QIC',
    headline: 'QIC and Future Fund acquire 19.9% Tilt Renewables stake from AGL for A$750m',
    summary: 'QIC-led consortium with Future Fund picks up most of AGL\'s 20% stake in Tilt for A$750m. Tilt will refocus on storage in QLD and breaking the Australian wind farm financing drought (Waddi 108MW + Palmer 275MW pushing for FID end-2025).',
    source: 'QIC',
    published_at: '2025-11-15',
    tags: ['Solar', 'Wind', 'BESS', 'M&A', 'Buys', 'Finance', 'Australia'],
  },
  {
    cp: 'Future Fund',
    headline: 'Future Fund joins QIC consortium buying 19.9% Tilt Renewables from AGL',
    summary: 'Future Fund partners with QIC on the A$750m acquisition of AGL\'s Tilt stake. Strategy: underwrite new renewable energy + storage projects via long-term PPAs.',
    source: 'Capital Brief',
    published_at: '2025-11-15',
    tags: ['Solar', 'Wind', 'M&A', 'Buys', 'Finance', 'Australia'],
  },
  {
    cp: 'Tilt Renewables',
    headline: 'Tilt enters new era under QIC + Future Fund ownership; pushing Waddi and Palmer to FID',
    summary: 'After AGL sold most of its stake to QIC and Future Fund (A$750m), Tilt\'s next-phase focus is QLD storage and ending Australia\'s wind drought. 108MW Waddi (WA) and 275MW Palmer (SA) targeting FID end-2025, both with AGL PPAs.',
    source: 'Capital Brief',
    published_at: '2025-11-15',
    tags: ['Wind', 'BESS', 'Finance', 'PPA', 'Australia'],
  },
  {
    cp: 'AGL',
    headline: 'AGL signs 15-year PPA with 108MW Waddi wind farm (WA) — ends wind drought',
    summary: 'AGL takes 100% offtake from the 108MW Waddi wind farm north of Perth for 15 years. Tilt-developed, expected FID end-2025. Helps end Australia\'s recent wind farm financing drought.',
    source: 'RenewEconomy',
    published_at: '2025-10-22',
    tags: ['Wind', 'PPA', 'Finance', 'Australia'],
  },

  // ─── CIS Tenders ───────────────────────────────────────────────────────
  {
    cp: null,
    headline: 'CIS Tender 3 results: 16 BESS projects awarded 4GW / 15GWh of storage',
    summary: 'Australia\'s biggest battery auction announced 16 winning projects on 16 Sept 2025 — 4.13GW dispatchable capacity, 15GWh energy. Distribution: 5 NSW, 5 VIC, 4 QLD, 2 SA. Enough storage for 3.5m households for 4 hours.',
    source: 'Modo Energy / WattClarity',
    published_at: '2025-09-16',
    tags: ['BESS', 'Tender', 'CIS', 'Market', 'Australia'],
  },
  {
    cp: null,
    headline: 'CIS Tender 4 results: 20 projects deliver 6.6GW renewable generation',
    summary: 'October 2025 CIS Tender 4 announcement — 20 projects, 6.6GW (above 6GW target). 12 of 20 are hybrid solar/wind + BESS, contributing 3,500MW / 11,400MWh storage. Solar-plus-storage dominated the awards.',
    source: 'DCCEEW / PV Magazine',
    published_at: '2025-10-09',
    tags: ['Solar', 'Wind', 'BESS', 'Tender', 'CIS', 'Market', 'Australia'],
  },
  {
    cp: null,
    headline: 'CIS Tender 6 (WA WEM) bidding closed; 2,400MWh dispatchable target',
    summary: 'Bidding for CIS Tender 6 closed 7 November 2025; targets 2,400MWh of dispatchable capacity in the Western Australia WEM. Successful bids expected March-April 2026.',
    source: 'DCCEEW',
    published_at: '2025-11-07',
    tags: ['BESS', 'Tender', 'CIS', 'WA', 'Australia'],
  },
  {
    cp: null,
    headline: 'CIS Tender 7 (NEM) bidding closed; targeting 5GW renewable generation',
    summary: 'Bidding for CIS Tender 7 closed 9 December 2025. Aims to deliver 5GW of renewable generation across the NEM. Results expected around May 2026.',
    source: 'DCCEEW',
    published_at: '2025-12-09',
    tags: ['Solar', 'Wind', 'Tender', 'CIS', 'Market', 'Australia'],
  },
  {
    cp: 'Squadron Energy',
    headline: 'Squadron / Windlab among CIS underwriting contract winners',
    summary: 'Squadron Energy and its Windlab subsidiary among the owners of 20 renewable + storage projects securing underwriting contracts in the latest Capacity Investment Scheme round.',
    source: 'Sharecafe',
    published_at: '2025-10-09',
    tags: ['Wind', 'Solar', 'BESS', 'CIS', 'Tender', 'Australia'],
  },

  // ─── Quinbrook / Stonepeak / Palisade ──────────────────────────────────
  {
    cp: 'Quinbrook Infrastructure Partners',
    headline: 'Quinbrook powers up 619MWh Supernode BESS Stage 1 in Queensland',
    summary: 'Stage 1 of the Supernode BESS at South Pine substation (260MW / 619MWh) commenced commercial operations. Stage 2 (780MW) submitted for EPBC approval; Stage 4 will add 250MW / 2,000MWh by end-2026.',
    source: 'Energy-Storage.News',
    published_at: '2026-01-20',
    tags: ['BESS', 'Australia'],
  },
  {
    cp: 'Quinbrook Infrastructure Partners',
    headline: 'Quinbrook secures A$722m debt financing for Supernode BESS Stages 1+2',
    summary: 'Quinbrook arranged A$722m (US$477m) debt financing in January 2025 through a consortium of Bank of America, Commonwealth Bank, Deutsche Bank, Mizuho and MUFG to fund construction of Supernode Stages 1 and 2.',
    source: 'Energy-Storage.News',
    published_at: '2025-01-15',
    tags: ['BESS', 'Finance', 'Australia'],
  },
  {
    cp: 'Quinbrook Infrastructure Partners',
    headline: 'Quinbrook sells Energy Locals retailer to Palisade Impact-led consortium',
    summary: 'Quinbrook agreed to sell green energy retailer Energy Locals to a consortium led by Palisade Impact. Energy Locals supplies 260,000+ contracted/active retail and business customers across multiple Australian states.',
    source: 'Quinbrook / IPE',
    published_at: '2025-12-10',
    tags: ['Retail', 'M&A', 'Sells', 'Australia'],
  },
  {
    cp: 'Palisade',
    headline: 'Palisade Impact buys Energy Locals retailer from Quinbrook',
    summary: 'Palisade Impact-led consortium acquires Energy Locals (Australian green energy retailer; 260k+ customers) from Quinbrook Infrastructure Partners.',
    source: 'IPE',
    published_at: '2025-12-10',
    tags: ['Retail', 'M&A', 'Buys', 'Australia'],
  },

  // ─── Octopus / APG ─────────────────────────────────────────────────────
  {
    cp: 'Octopus Australian Sustainable Investments (OASIS)/APG',
    headline: 'APG invests A$1bn in Octopus Australia OASIS renewables platform',
    summary: 'Dutch pension giant APG Asset Management commits over AUD 1bn to Octopus Australia\'s flagship OASIS renewables platform. Octopus operating + development portfolio now exceeds AUD 11bn across wind, solar and battery storage.',
    source: 'PV Tech / PV Magazine',
    published_at: '2025-07-29',
    tags: ['Solar', 'Wind', 'BESS', 'Finance', 'Buys', 'Australia'],
  },
  {
    cp: 'APG',
    headline: 'APG commits A$1bn to Octopus Australia OASIS platform',
    summary: 'APG Asset Management partners with Octopus Australia, injecting AUD 1bn+ into the OASIS renewables platform. OASIS includes operational assets (333MW Darlington Point solar, 180MW Dulacca wind) and pipeline (300MW Blind Creek, 500MW Blackstone BESS, others).',
    source: 'PV Tech',
    published_at: '2025-07-29',
    tags: ['Solar', 'Wind', 'BESS', 'Finance', 'Buys', 'Australia'],
  },

  // ─── Rio Tinto / BHP / Fortescue ───────────────────────────────────────
  {
    cp: 'Rio Tinto',
    headline: 'Rio Tinto signs Australia\'s biggest renewable PPA — 80% off 1.4GW Bungaban wind',
    summary: 'Rio Tinto takes 80% of output from the 1.4GW Bungaban wind project developed by Squadron-owned Windlab. 25-year PPA. Construction expected to start late 2025; production by 2029. Powers Gladstone smelter + refineries.',
    source: 'RenewEconomy / Rio Tinto',
    published_at: '2025-11-08',
    tags: ['Wind', 'PPA', 'Finance', 'Buys', 'Australia'],
  },
  {
    cp: 'Squadron Energy',
    headline: 'Squadron-owned Windlab signs 1.4GW Bungaban wind PPA with Rio Tinto',
    summary: 'Australia\'s biggest renewable PPA: Rio Tinto takes 80% of the 1.4GW Bungaban wind project developed by Squadron Energy\'s Windlab subsidiary, 25-year term. Production targeted 2029.',
    source: 'RenewEconomy',
    published_at: '2025-11-08',
    tags: ['Wind', 'PPA', 'Sells', 'Australia'],
  },
  {
    cp: 'Rio Tinto',
    headline: 'Rio Tinto signs PPA for 1.1GW Upper Calliope solar farm (European Energy)',
    summary: 'Rio Tinto enters long-term PPA with European Energy for output from the proposed 1.1GW Upper Calliope solar farm in Queensland.',
    source: 'PV Tech / PV Magazine',
    published_at: '2025-11-15',
    tags: ['Solar', 'PPA', 'Finance', 'Buys', 'Australia'],
  },
  {
    cp: 'European Energy',
    headline: 'European Energy signs 1.1GW Upper Calliope solar PPA with Rio Tinto',
    summary: 'Danish developer European Energy lands long-term PPA with Rio Tinto for the 1.1GW Upper Calliope solar farm in Queensland — Australia\'s largest corporate renewable PPA.',
    source: 'European Energy',
    published_at: '2025-11-15',
    tags: ['Solar', 'PPA', 'Sells', 'Australia'],
  },
  {
    cp: 'BHP',
    headline: 'BHP signs PPA with Neoen for Olympic Dam (Goyder Stage 1b wind + Blyth BESS)',
    summary: 'Neoen will supply renewable energy to BHP\'s Olympic Dam mine in SA from July 2025, enabled by 203MW Goyder South Stage 1b wind + 238.5MW Blyth Battery.',
    source: 'Austrade',
    published_at: '2025-07-01',
    tags: ['Wind', 'BESS', 'PPA', 'Buys', 'Australia'],
  },
  {
    cp: 'Fortescue*',
    headline: 'Fortescue Cloudbreak mine 190MW solar farm — A$1bn green power project',
    summary: 'A$1bn 190MW solar farm to power Fortescue\'s Cloudbreak iron ore mine. Operations starting 2027.',
    source: 'Investing News',
    published_at: '2025-12-05',
    tags: ['Solar', 'Finance', 'Buys', 'Australia'],
  },

  // ─── EnergyAustralia / Banpu ───────────────────────────────────────────
  {
    cp: 'Energy Australia',
    headline: 'EnergyAustralia and Banpu building 350MW/1400MWh BESS at Latrobe Valley',
    summary: 'Joint EnergyAustralia + Banpu PCL battery project to replace the retiring Yallourn brown coal plant in Victoria. Operations expected by 2027.',
    source: 'Airswift',
    published_at: '2025-10-30',
    tags: ['BESS', 'Australia'],
  },
  {
    cp: 'Banpu',
    headline: 'Banpu partners with EnergyAustralia on 350MW Latrobe Valley BESS',
    summary: 'Thai energy major Banpu PCL is co-developing the 350MW / 1400MWh Yallourn-replacement BESS with EnergyAustralia. Targets 2027 operations.',
    source: 'Airswift',
    published_at: '2025-10-30',
    tags: ['BESS', 'Australia'],
  },

  // ─── Engie / Acciona / EDF / RWE platform notes ────────────────────────
  {
    cp: 'Acciona',
    headline: 'ACCIONA Energía: Australia can deliver one of world\'s most ambitious clean energy transformations',
    summary: 'ACCIONA reiterates its Australian growth conviction in 2026 sector outlook — calls Australia among the world\'s most ambitious clean energy transformations.',
    source: 'Energy Magazine',
    published_at: '2026-02-28',
    tags: ['Solar', 'Wind', 'Market', 'Australia'],
  },
  {
    cp: 'Iberdrola',
    headline: 'Iberdrola Australia continues onshore + offshore + transmission build-out',
    summary: 'Iberdrola Australia 2026 platform update: billions invested across onshore, offshore wind and transmission, plus green hydrogen and industrial electrification projects underway.',
    source: 'Iberdrola Factbook',
    published_at: '2025-07-09',
    tags: ['Wind', 'Offshore', 'Finance', 'Australia'],
  },
];

(async () => {
  const cps = await sql`SELECT id, name FROM counterparties ORDER BY name`;

  // First, harmonise existing tag vocabulary: replace 'Sales' with 'Sells'
  // across counterparty_news so the analytics page shows a single canonical tag.
  const renamed = await sql`
    UPDATE counterparty_news
    SET tags = ARRAY(SELECT CASE WHEN t = 'Sales' THEN 'Sells' ELSE t END FROM unnest(tags) AS t),
        updated_at = NOW()
    WHERE 'Sales' = ANY(tags)
    RETURNING id
  `;
  console.log(`Renamed 'Sales' → 'Sells' on ${renamed.length} existing rows.`);

  let ok = 0, dup = 0, miss = 0;
  for (const n of NEWS) {
    let cpId = null;
    if (n.cp) {
      const hit = lookup(cps, n.cp);
      if (!hit) {
        console.log('NO MATCH:', n.cp, '— skipping:', n.headline);
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

  console.log(`Inserted: ${ok}, duplicates skipped: ${dup}, unmatched: ${miss}`);
  const [{ total }] = await sql`SELECT COUNT(*)::int AS total FROM counterparty_news`;
  console.log(`Total counterparty_news rows now: ${total}`);
})().catch((err) => { console.error(err); process.exit(1); });
