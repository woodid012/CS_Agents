# Scripts

## audit-data.js

Data quality checker for bidder data and market data files.

```bash
node scripts/audit-data.js           # Standard audit
node scripts/audit-data.js --verbose
node scripts/audit-data.js --json
```

## migrate-to-neon.js

One-time migration of legacy JSON files into Neon PostgreSQL.

## test-api.js

Tests data loading and verifies bidder/insight data integrity.

```bash
node scripts/test-api.js
```
