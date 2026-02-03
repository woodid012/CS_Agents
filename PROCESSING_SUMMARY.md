# AI Insights Processing Summary

## Tasks Completed

### 1. Cleaned AI Insights
- **File**: `data/ai-insights.json`
- **Action**: Removed bidder name prefixes (e.g., "Acciona — ", "AGL Australia — ") from all 191 entries
- **Result**: Each insight now starts directly with the content
- **Example**:
  - Before: `"Acciona — No major Aus M&A announced 2025-26..."`
  - After: `"No major Aus M&A announced 2025-26..."`

### 2. Created Merged Insights
- **File**: `data/merged-insights.json` (NEW)
- **Action**: Generated AI-assessed synthesis combining CS insights (from Excel) and AI insights
- **Strategy**:
  - Extracts status assessment (e.g., "Very active", "FIRB risk", "SUGGEST UPGRADE")
  - Combines key points from both sources
  - Removes redundancy
  - Limits to 1-3 sentences (~250 chars max)
  - Does NOT include bidder name
- **Coverage**: 191 merged insights generated

### 3. Updated API Route
- **File**: `app/api/bidders/route.js`
- **Changes**:
  - Added loading of `merged-insights.json`
  - Added `mergedInsights` field to each bidder response
  - Removed caching (now always loads fresh data)

### 4. Updated BidderTable Component
- **File**: `components/BidderTable.jsx`
- **Changes**:
  - `MergedInsightCell` now displays `bidder.mergedInsights` from server
  - Removed client-side concatenation of CS + AI
  - Simplified component logic

### 5. Updated ExportBar Component
- **File**: `components/ExportBar.jsx`
- **Changes**:
  - Removed client-side merge logic in `exportRows`
  - Now uses server-provided `mergedInsights` field directly

## Scripts Created

### 1. Process Insights Script
- **File**: `scripts/process-insights.js`
- **Purpose**: Processes AI insights and generates merged insights
- **Usage**: `node scripts/process-insights.js`
- **Features**:
  - Cleans AI insights (removes name prefixes)
  - Reads CS insights from Excel via parseExcel
  - Generates intelligent merged insights
  - Handles formatting (no double periods, proper spacing)
  - Shows sample outputs for verification

### 2. Test API Script
- **File**: `scripts/test-api.js`
- **Purpose**: Verifies data loading and formatting
- **Usage**: `node scripts/test-api.js`
- **Checks**:
  - Data loading from all JSON files
  - Sample bidder data structure
  - Formatting issues (double periods, etc.)

## Data Files

| File | Entries | Size | Description |
|------|---------|------|-------------|
| `ai-insights.json` | 191 | 18.6 KB | Cleaned AI insights (no name prefixes) |
| `merged-insights.json` | 191 | 17.2 KB | Combined CS + AI insights |
| `ai-tier-scores.json` | 191 | 19.9 KB | Unchanged |
| `contacts.json` | minimal | 2 bytes | Unchanged |

## Example Merged Insights

**#3 - APG:**
- CS: "Would need to partner..."
- AI: "Committed US$650M to Octopus Australia (Jul 2025). Very active deployer in Aus renewables..."
- Merged: "Committed US$650M to Octopus Australia (Jul 2025). Would need to partner."

**#40 - Brookfield:**
- CS: "Indicated that acquisitions can be considered through NEOen..."
- AI: "SUGGEST UPGRADE TO TIER 1. Completed €6.1B Neoen acquisition (Apr 2025)..."
- Merged: "SUGGEST UPGRADE. Completed €6.1B Neoen acquisition (Apr 2025). Indicated that acquisitions can be considered through NEOen."

**#75 - Sembcorp:**
- CS: "Indicated appetite to expand renewables exposure..."
- AI: "SUGGEST UPGRADE TO TIER 1. Acquired Alinta Energy for A$6.5B (Dec 2025)..."
- Merged: "SUGGEST UPGRADE. Acquired Alinta Energy for A$6.5B (Dec 2025). Indicated appetite to expand renewables exposure and have been bidding in various processes in Australia including Edify."

**#94 - BJEI:**
- CS: "..."
- AI: "ABANDONED 1GW+ solar acquisition after FAILING FIRB approval..."
- Merged: "ABANDONED 1GW+ solar acquisition after FAILING FIRB approval. Remove or flag as non-viable due to FIRB."

## Verification

All tasks completed successfully:
- ✓ AI insights cleaned (191 entries)
- ✓ Merged insights generated (191 entries)
- ✓ No formatting issues (no double periods)
- ✓ API route updated
- ✓ BidderTable component updated
- ✓ ExportBar component updated
- ✓ Test script confirms data integrity

## Next Steps

1. Restart the Next.js development server to load the updated data
2. Verify the merged insights display correctly in the UI
3. Test CSV/Excel export to ensure merged insights are included
4. If needed, run `node scripts/process-insights.js` to regenerate merged insights when CS commentary or AI insights are updated
