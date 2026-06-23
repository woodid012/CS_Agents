# CS Capital CRM — architecture & handover map

A map of the whole CRM, written the way `COMPS_PIPELINE.md` documents the comps
data-runner: enough for someone to **further design and build** each module
without reverse-engineering the code first. Comps is the most mature module and
is the **reference pattern** the rest should grow toward (see §6).

> Status legend used throughout: **Mature** (documented + repeatable pipeline) ·
> **Stable** (works, ad-hoc, no pipeline/validation) · **Minimal** (small CRUD) ·
> **Legacy** (Excel-backed / pre-migration, candidate for rework).

---

## 1. What this is

A Next.js (App Router) CRM for CS Capital's Australian energy-transition deal
work. It tracks **counterparties** (bidders / offtakers), the **projects** they're
matched to, **meetings & news** about them, and a set of **market-data** and
**research** modules (price curves, BESS cases, capex benchmarks, and the
curated **comps** dataset). Backend is a single **Neon PostgreSQL** database
(`DATABASE_URL`); auth is **Microsoft Entra ID** restricted to `@cscapital.com.au`.

---

## 2. The map — modules

Navigation (`components/NavBar.jsx`) has three dropdown pillars plus two top
links. Pages outside the nav still exist as routes (legacy / not yet wired in).

### Pillar: Counterparties
| Route | Page | API | Backed by | Status |
|---|---|---|---|---|
| `/` | `app/page.js` | `/api/counterparties`, `/api/counterparties/[id]`, `.../meetings`, `.../projects`, `/api/meetings/[id]`, `/api/counterparties/export` | DB: `counterparties`, `meetings`, `counterparty_projects` | Stable |
| `/projects` | `app/projects/page.js` | `/api/projects`, `/api/projects/[id]` | DB: `projects`, `counterparty_projects` | Minimal (auth-protected) |
| `/analytics` | `app/analytics/page.js` | `/api/counterparty-news`, `/api/market-context` | DB: `counterparty_news` + `data/australia-market.json` | Stable |

### Pillar: Data — Prices
| Route (nav label) | Page | API | Backed by | Status |
|---|---|---|---|---|
| `/market-data/price-curves` ("File Repository") | `app/market-data/price-curves/page.js` | `/api/market-data/price-curves`, `/api/price-curve-files` | DB: `price_curves` + curve files | Stable |
| `/market-data/forward-curves` ("Electricity Market Curves") | `app/market-data/forward-curves/page.js` | `/api/price-curves` | DB: `price_curves` | Stable |
| `/market-data/bess-cases` ("BESS Market Curves") | `app/market-data/bess-cases/page.js` | `/api/bess-cases` | DB: `bess_cases` (created in handler) | Stable |

### Pillar: Data — Capex
| Route (nav label) | Page | API | Backed by | Status |
|---|---|---|---|---|
| `/capex` ("Project Capex") | `app/capex/page.js` | `/api/capex/data-capex`, `.../upload` | DB: `data_capex` (Excel upload) | Stable |
| `/market-data/capex-opex` ("Benchmarks") | `app/market-data/capex-opex/page.js` | `/api/market-data/capex-opex` | DB: `capex_opex` | Stable |

### Top links
| Route | Page | API | Backed by | Status |
|---|---|---|---|---|
| `/comps` | `app/comps/page.js` | `/api/comps/deals`, `.../deals/[id]`, `/api/comps/metrics`, `/api/comps/resync` | DB: `comp_deals`, `comp_metrics` ← `data/comps-scrape.json` | **Mature** (see §6) |
| `/ideas` | `app/ideas/page.js` | `/api/ideas` | DB: `ideas` (created in handler) | Minimal |

### Not in the nav (legacy / unwired)
| Route | Page | Notes |
|---|---|---|
| `/offtakers` | `app/offtakers/page.js` | Excel-backed via `/api/offtakers`; superseded by unified counterparties. **Legacy.** |
| `/login` | `app/login/page.js` | Entra ID sign-in; redirects in once authenticated. |
| `/dashboard`, `/development-tracker` | resp. pages | Placeholders / minimal. |
| — | — | `/api/bidders` exists (Excel-backed) with no nav page. **Legacy.** |

---

## 3. Data layer

**Database — Neon PostgreSQL.** One connection (`DATABASE_URL`), lazy client in
`lib/db.js`. The canonical DDL is `schema.sql`; a few tables (`ideas`,
`bess_cases`) are created lazily inside their route handlers rather than in
`schema.sql` — fold those back into `schema.sql` when you touch them.

Tables in `schema.sql`:

| Table | Role |
|---|---|
| `counterparties` | Unified bidder/offtaker master (a row can be both). `states[]`, `tier`, `archetype`, `status`. |
| `meetings` | Meeting log per counterparty (FK, cascade). |
| `projects` | Deal/project codes; `name` unique. |
| `counterparty_projects` | Many-to-many counterparty↔project join. |
| `counterparty_news` | News items (counterparty FK nullable = general market news); `tags[]`. |
| `comp_deals` | One row per comp deal/asset/transaction. |
| `comp_metrics` | Tall EAV table: one row per observed stat; taxonomy in `lib/compsTaxonomy.js`. |
| `capex_opex` | Capex/opex benchmarks ($/MW, $/MW/yr) by tech/scale/region/year. |
| `data_capex` | Project capex line items ingested from Excel. |
| `price_curves` | Flat curve table (scenario, state, year, energy_price, lgc_price). |
| `bidder_ai_data`, `bidder_insight_status`, `offtaker_ai_data`, `offtaker_insight_status`, `contacts` | **Legacy** — AI insight/contact caches from the pre-counterparties Excel era. |

**Source-of-truth split** — important for anyone redesigning:
- **DB is SoT** for counterparties, meetings, projects, news, capex, benchmarks, price curves.
- **JSON file is SoT** for comps: `data/comps-scrape.json` → synced into the DB
  (DB is a read replica; see §6). This is the one module where you edit a file,
  not the DB.
- **Excel is SoT** for the legacy bidder/offtaker rosters (`/api/bidders`,
  `/api/offtakers` parse `.xlsx` directly; only AI insights/contacts live in DB).

**JSON in `data/`:** `comps-scrape.json` (live comps), `comps-candidates.json`
(staging inbox), `comps-candidates-archive.json` (audit trail),
`australia-market.json` (static market context for `/analytics`), plus several
`*-insights*.json` / `contacts.json` that are **legacy** (already migrated to DB
by `scripts/migrate-to-neon.js`). `data/new_data/` is an untracked scratch area.

---

## 4. Shared libraries (`lib/`)

| File | Purpose |
|---|---|
| `db.js` | Neon client (`sql`), lazy-init. |
| `compsDb.js` | Comps schema create + seed/resync from `comps-scrape.json`. |
| `compsTaxonomy.js` | **Single source of truth** for comps categories, metrics, units, bases, technologies, states, schemes, statuses, confidence, data classes. The validator and UI both read it. |
| `parseExcel.js`, `parseOfftakerExcel.js` | Parse the legacy bidder/offtaker `.xlsx` rosters. |
| `exportCsv.js` | CSV/export helper + button. |
| `vintageLabel.js` | Format/sort price-curve "vintage" labels. |

## 5. Scripts (`scripts/`)

- **Comps pipeline:** `validate-candidates.js` (deterministic gate),
  `merge-candidates.js` (promote approved → live JSON + sync), `scrape-comps.js`
  (JSON → DB upsert). Wired as npm scripts: `validate-comps`, `merge-comps`,
  `scrape-comps`.
- **Migrations / seeds:** `migrate-to-neon.js`, `migrate-to-counterparties.js`,
  `migrate-price-curves.js`, `migrate-bess-cases.js`, `migrate-add-scenario-column.js`,
  `seed-price-curves.js`, `seed-scenario-curves.js`, `seed-bess-cases.js`,
  `reseed-counterparties.js`, `seed-news-batch1.js`, `seed-news-batch2.js`,
  `extract-curve-metadata.js`, `fix-bess-fy-offset.js`.
- **Diagnostics:** `audit-data.js` (coverage/dupes/gaps), `test-api.js`.

## 6. Auth

`auth.js` (NextAuth v5 / Entra ID) + `middleware.js` + `app/api/auth/[...nextauth]`
+ `app/login` + `components/AuthButton.jsx`. Only `@cscapital.com.au` accounts
pass the sign-in callback. Protected routes are enforced in middleware (currently
`/projects`, `/offtakers`); most other pages are public. **Note:** this auth layer
is in the working tree but not yet committed — confirm before relying on it.

---

## 7. The reference pattern — two-tier data runner (comps)

This is the template to replicate for any module that ingests external data. A
**cheap model scrapes** candidates; a **smart model gatekeeps** before anything
enters the live dataset; **deterministic scripts** do the mechanical checks so the
models only do what each is good at. Full detail in `COMPS_PIPELINE.md`.

```
 web sources → [comps-scraper (Haiku)] → data/comps-candidates.json (review:"pending")
                       │  validate-candidates.js (schema/taxonomy/dupes/urls — must be 0 errors)
                       ▼
              [comps-gatekeeper (Opus)] fact-checks each source_url → approved/rejected
                       │  merge-candidates.js (promote approved, archive rest)
                       ▼
              data/comps-scrape.json (live SoT) → scrape-comps.js → Neon comp_deals/comp_metrics → /comps
```

Why it works, and what makes it portable to other modules:
1. **Staging inbox** — candidates wait in a `*-candidates.json` until approved;
   bad data never lands in the live set.
2. **Deterministic gate first** — a validator enforces schema, a taxonomy
   (`lib/*Taxonomy.js`), source URLs and de-duplication before any model judges.
3. **Model split** — **Sonnet** scraper for breadth, **Opus** for skeptical
   fact-checking. **Do NOT use Haiku for the scraper:** a Haiku run produced 17
   plausible-looking candidates and the gatekeeper rejected **all 17** as
   fabricated; a like-for-like Sonnet rerun scored **10/10 approved**. The gate is
   the point — but a too-cheap scraper just wastes the expensive gatekeeper pass.
4. **JSON SoT + DB replica** — the dataset is version-controlled and diff-able;
   the DB is rebuilt from it idempotently.
5. **Audit trail** — every processed candidate is archived with its verdict.

---

## 8. Maturity assessment & what a designer should do next

| Module | Status | Biggest gap to close |
|---|---|---|
| **Comps** | Mature | Tighten the scraper (hallucination rate is high); consider auto-running the validator inside the scraper agent loop. |
| **Counterparty news** | Stable | No staging/validation. **Best next candidate for the comps pattern**: a news-scraper → gatekeeper → `counterparty_news`, with a source whitelist + dedupe-by-URL. |
| **Counterparties** | Stable | No bulk import, no dedupe/merge rules for same-entity-different-name, no validation beyond form + DB constraints. |
| **Market data (price curves, BESS)** | Stable | One-time migrations only; no defined "new vintage arrives" refresh path or curve-consistency validation. Decide who owns the source Excel and how it re-syncs. |
| **Capex benchmarks / project capex** | Stable | No source/provenance enforcement, no dedupe (same tech+scale+region or same file+reference). |
| **Bidders / offtakers (legacy)** | Legacy | Decide: retire in favour of unified `counterparties`, or keep Excel as SoT and document the sync. Two parallel models is the main piece of tech debt. |
| **Projects / Ideas** | Minimal | Fine as-is; revisit only if lifecycle/milestones are needed. |

---

## 9. How to extend

**Add a simple CRUD module:** create `app/<module>/page.js` (client component) +
`app/api/<module>/route.js` (GET/POST/PATCH/DELETE), add the table to `schema.sql`
with `CREATE TABLE IF NOT EXISTS` (call it from the route on first hit), and add a
nav entry in `components/NavBar.jsx`.

**Add a research/ingest module (replicate comps):**
1. `lib/<module>Taxonomy.js` — define the allowed categories/metrics/units/enums.
2. `data/<module>-candidates.json` — staging inbox (`{ candidates: [] }`).
3. `.claude/agents/<module>-scraper.md` (Haiku) and `<module>-gatekeeper.md` (Opus).
4. `scripts/validate-<module>-candidates.js`, `scripts/merge-<module>-candidates.js`,
   `scripts/<module>-sync.js`; wire them as npm scripts.
5. `<MODULE>_PIPELINE.md` documenting the flow (mirror `COMPS_PIPELINE.md`).

---

## 10. Run & deploy

- **Env:** `DATABASE_URL` (Neon) + Entra ID vars (see `.env.local.example`).
- **Dev:** `npm run dev`. **Build/start:** `npm run build` / `npm start`.
- **Target:** Google Cloud Run (per project direction). Tables auto-create on
  first API hit, or apply `schema.sql` manually.
</content>
</invoke>
