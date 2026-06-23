# Comps data runner — two-tier pipeline

A cheap model **scrapes** candidates; a smart model **gatekeeps** before anything
enters the live dataset. Deterministic scripts do the mechanical checks so the
models only do what each is good at.

```
                 ┌─────────────────────┐         ┌──────────────────────────┐
  web sources →  │  comps-scraper       │   →     │  comps-gatekeeper         │  →  live dataset
                 │  (Haiku, cheap)      │ stage   │  (Opus, smart)            │     + standalone page
                 │  searches, extracts  │         │  fact-checks, approves,   │
                 │  → candidates.json   │         │  merges                   │
                 └─────────────────────┘         └──────────────────────────┘
                          │                                  │
                  validate-candidates.js  ◀── shared gate ──▶ merge-candidates.js
```

## Pieces
| File | Role |
|---|---|
| `data/comps-candidates.json` | Staging inbox. Scraper appends candidates (`review: "pending"`). |
| `scripts/validate-candidates.js` | Deterministic gate: schema, taxonomy membership, references, value sanity, duplicates. Both tiers run it. |
| `scripts/merge-candidates.js` | Gatekeeper-only: promotes `review: "approved"` rows into `data/comps-scrape.json`, archives processed ones, rebuilds `public/comps.html`. |
| `data/comps-candidates-archive.json` | History of processed (approved + rejected) candidates. |
| `.claude/agents/comps-scraper.md` | Haiku subagent — the scraper. |
| `.claude/agents/comps-gatekeeper.md` | Opus subagent — the gatekeeper. |
| `lib/compsTaxonomy.js` | Single source of truth (metrics, units, schemes) the validator parses. |

## Running it

**In Claude Code** (the intended flow — model split is built into the agents):
```
> use the comps-scraper subagent to find new SA and QLD battery comps from the last year
  …Haiku stages candidates into data/comps-candidates.json…
> use the comps-gatekeeper subagent to review and merge the candidates
  …Opus fact-checks, approves/rejects, merges, rebuilds the page…
```

**Headless / scriptable** (e.g. cron) — same split via model flags:
```bash
claude -p --model haiku "Run the comps-scraper workflow for recent NEM battery deals"
claude -p --model opus  "Run the comps-gatekeeper workflow on data/comps-candidates.json"
```

**Manual checks** (no model needed):
```bash
npm run validate-comps                 # validate the candidate inbox
npm run merge-comps -- --dry           # preview what would be promoted
npm run merge-comps                    # promote approved + rebuild page
```

## Guarantees
- Nothing reaches `comps-scrape.json` without passing `validate-candidates.js`
  **and** a gatekeeper `approved`.
- Every promoted row carries a `source_url` (enforced unless `confidence:
  "Illustrative"`).
- Duplicates (by name) and double-counted totals/per-unit rows are rejected.
- Approved/rejected candidates are archived with a timestamp for an audit trail.
