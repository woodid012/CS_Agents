# CS Capital CRM

Internal CRM and analytics dashboard for CS Capital's renewable energy M&A advisory practice. Built with Next.js 14, Tailwind CSS, and Neon PostgreSQL.

## Overview

The platform tracks bidder engagement, offtaker relationships, AI-generated insights, and Australian market intelligence for renewable energy transactions.

## Features

### CRM
- **Master Bidder List** — full bidder engagement tracking with tier, geography, type, commentary, and contact details
- **Offtaker Engagement List** — counterparty tracking with offtaker-specific insights

### Analytics (`/analytics`)
- Bidder tier distribution, type breakdown, and geography charts
- Flagged tables: Tier 1 bidders, Suggest Upgrade candidates (Tier 2+ with A/B AI score), FIRB risk bidders
- Australia market context panel (CIS tenders, FIRB landscape, ACCC merger regime)
- Major transactions panel (recent M&A deals with live data)
- Recent news and intelligence feed
- Investor AUM and Australia capex reference table
- Key transmission infrastructure tracker

### Market Data
- **Price Curves** (`/market-data/price-curves`) — forward price curve data
- **Capex / Opex** (`/market-data/capex-opex`) — capex and opex benchmarks

### Other
- **Development Tracker** (`/development-tracker`) — project pipeline tracking
- **AI Agents** (`/ai-agents`) — AI insight generation and processing

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Database | Neon PostgreSQL (serverless) |
| Data | Excel (.xlsx) via `xlsx` library + PostgreSQL |
| AI | Claude API (via AI Agents page) |
| Deployment | Azure App Service / Azure Static Web Apps |

## Project Structure

```
cs-capital-crm/
├── app/
│   ├── analytics/          # Analytics dashboard
│   ├── api/
│   │   ├── bidders/        # Bidder data API (Excel + DB merge)
│   │   ├── offtakers/      # Offtaker data API
│   │   ├── insight-status/ # AI insight processing status
│   │   └── market-data/    # Price curves and capex data APIs
│   ├── market-data/        # Market data pages
│   ├── offtakers/          # Offtaker engagement page
│   ├── development-tracker/# Project pipeline tracker
│   ├── ai-agents/          # AI insight generation
│   ├── layout.js           # Root layout with NavBar
│   └── page.js             # Master Bidder List (home)
├── components/
│   ├── NavBar.jsx           # Navigation bar
│   ├── BidderTable.jsx      # Bidder list table
│   ├── FilterBar.jsx        # Bidder filtering
│   ├── ExportBar.jsx        # Excel export
│   └── OfftakerTable.jsx    # Offtaker table
├── data/
│   ├── australia-market.json # AU market context (enriched with live data)
│   ├── capex-data.json       # Investor AUM and capex data (live data)
│   ├── ai-insights.json      # AI-generated bidder insights
│   ├── ai-tier-scores.json   # AI tier scores (A/B/C/D labels + reasons)
│   ├── merged-insights.json  # Combined CS + AI insights
│   └── contacts.json         # Bidder contact details
├── lib/
│   ├── db.js                # Neon PostgreSQL client
│   ├── parseExcel.js        # Excel parser for Master Bidder List
│   └── parseOfftakerExcel.js# Excel parser for Offtaker List
├── scripts/
│   ├── audit-data.js        # Data quality checker (run: node scripts/audit-data.js)
│   ├── migrate-to-neon.js   # One-time DB migration script
│   └── process-insights.js  # AI insight processing script
└── Master Bidder Engagement List - CSC.xlsx  # Source data (not committed)
```

## Getting Started

### Prerequisites
- Node.js 18+
- Access to Neon PostgreSQL database
- Excel source file: `Master Bidder Engagement List - CSC.xlsx` in project root

### Environment Variables

Create a `.env.local` file:

```env
DATABASE_URL=postgresql://...@...neon.tech/neondb?sslmode=require
ANTHROPIC_API_KEY=sk-ant-...   # Required for AI Agents feature
```

### Install and Run

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

### Build

```bash
npm run build
npm start
```

## Scripts

### Data Quality Audit

```bash
node scripts/audit-data.js           # Standard audit
node scripts/audit-data.js --verbose # Verbose output with per-bidder issues
node scripts/audit-data.js --json    # JSON output (CI-friendly)
```

Checks: required field coverage, tier/type/geography distribution, duplicate names, sequence gaps, AI insight coverage, contact coverage, market data file integrity.

### AI Insight Processing

```bash
node scripts/process-insights.js
```

Generates AI insights for bidders via Claude API and stores in Neon DB.

### Database Migration

```bash
node scripts/migrate-to-neon.js
```

One-time migration of AI insights and contacts from JSON files to Neon PostgreSQL.

## Data Architecture

The bidder API (`/api/bidders`) merges three sources at runtime:

1. **Excel file** — master bidder data (no, name, geography, tier, type, commentary, engagement tracking)
2. **Neon DB `bidder_ai_data`** — AI insights, merged insights, AI scores and labels
3. **Neon DB `contacts`** — contact name, email, phone per bidder

Market data (`australia-market.json`, `capex-data.json`) is static JSON enriched periodically with live research.

## Market Data

`data/australia-market.json` contains:
- AU market overview (renewable share, capacity pipeline, AEMO forecasts)
- CIS tender progress (targets, awarded GW, risk factors)
- FIRB and ACCC regulatory landscape
- Major M&A transactions 2024-2026
- Key transmission projects
- Recent news and intelligence (enriched March 2026)

`data/capex-data.json` contains:
- AUM and Australia capex for 20+ investors (funds, utilities, super funds, pensions)
- Global summary and market outlook

## AI Tier Scoring

Each bidder receives an AI-generated score (1-5) and label (A/B/C/D):

| Label | Score | Meaning |
|---|---|---|
| A | 5 | Very high acquisition likelihood — recent Aus deals, large capital, active |
| B | 4 | High likelihood — active platform, known Aus interest |
| C | 3 | Moderate — possible but no specific recent signals |
| D | 1-2 | Low likelihood — inactive, divesting, or FIRB-constrained |

The Analytics page surfaces:
- **Suggest Upgrade**: Tier 2+ bidders with A/B AI label — worth escalating engagement
- **FIRB Risk**: Bidders where FIRB is flagged in insights — flag for deal team review

## Deployment

The app is deployed via GitHub Actions to Azure App Service. See `.github/workflows/` for CI/CD configuration.

Environment variable `DATABASE_URL` must be set in the Azure App Service configuration before deployment.
