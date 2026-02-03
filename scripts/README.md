# Scripts

## process-insights.js

Processes AI insights and generates merged insights combining CS commentary and AI analysis.

### What it does:
1. **Cleans AI insights** - Removes bidder name prefixes (e.g., "Acciona — ") from all entries
2. **Generates merged insights** - Creates intelligent synthesis of CS and AI insights:
   - Extracts status assessments (e.g., "Very active", "FIRB risk", "SUGGEST UPGRADE")
   - Combines key points from both sources
   - Removes redundancy
   - Limits to 1-3 sentences (~250 chars max)
   - Ensures clean formatting (no double periods)

### Usage:
```bash
node scripts/process-insights.js
```

### Input files:
- Excel: `Master Bidder Engagement List - CSC.xlsx` (CS commentary via parseExcel)
- JSON: `data/ai-insights.json` (AI insights - will be cleaned)

### Output files:
- `data/ai-insights.json` (cleaned - name prefixes removed)
- `data/merged-insights.json` (new - combined insights)

### When to run:
- After updating CS commentary in the Excel file
- After updating AI insights in `data/ai-insights.json`
- To regenerate merged insights with improved logic

---

## test-api.js

Tests data loading and verifies formatting of insights data.

### What it does:
1. Loads all data files (Excel + JSON)
2. Tests bidder data structure
3. Checks for formatting issues (double periods, etc.)
4. Shows sample merged insights

### Usage:
```bash
node scripts/test-api.js
```

### What it checks:
- Data loading from Excel and all JSON files
- Sample bidder records (#3, #5, #15, #40, #75, #94)
- Formatting issues (double periods)
- Data integrity

### When to run:
- After running `process-insights.js` to verify output
- Before deploying to verify data integrity
- When debugging data loading issues
