// One-time migration: seeds Neon from existing JSON data files
// Run: node scripts/migrate-to-neon.js

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL in .env.local');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

function loadJson(filename) {
  const filePath = path.join(__dirname, '../data', filename);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data;
  } catch {
    return {};
  }
}

async function migrate() {
  console.log('Starting migration to Neon...\n');

  const aiInsights = loadJson('ai-insights.json');
  const aiTierScores = loadJson('ai-tier-scores.json');
  const mergedInsights = loadJson('merged-insights.json');
  const offtakerInsights = loadJson('offtaker-insights.json');
  const bidderStatus = loadJson('ai-insights-status.json');
  const offtakerStatus = loadJson('offtaker-insights-status.json');

  // --- bidder_ai_data ---
  const bidderNos = [...new Set([
    ...Object.keys(aiInsights),
    ...Object.keys(aiTierScores),
    ...Object.keys(mergedInsights),
  ])].map(Number);

  if (bidderNos.length > 0) {
    for (const no of bidderNos) {
      const t = aiTierScores[String(no)] || {};
      await sql`
        INSERT INTO bidder_ai_data (bidder_no, ai_insights, merged_insights, ai_score, ai_label, ai_score_reason)
        VALUES (
          ${no},
          ${aiInsights[String(no)] || ''},
          ${mergedInsights[String(no)] || ''},
          ${t.score || 0},
          ${t.label || '-'},
          ${t.reason || ''}
        )
        ON CONFLICT (bidder_no) DO UPDATE SET
          ai_insights     = EXCLUDED.ai_insights,
          merged_insights = EXCLUDED.merged_insights,
          ai_score        = EXCLUDED.ai_score,
          ai_label        = EXCLUDED.ai_label,
          ai_score_reason = EXCLUDED.ai_score_reason,
          updated_at      = NOW()
      `;
    }
    console.log(`bidder_ai_data: ${bidderNos.length} rows upserted`);
  } else {
    console.log('bidder_ai_data: nothing to migrate');
  }

  // --- bidder_insight_status ---
  const bidderStatusEntries = Object.entries(bidderStatus);
  for (const [no, status] of bidderStatusEntries) {
    await sql`
      INSERT INTO bidder_insight_status (bidder_no, status)
      VALUES (${parseInt(no)}, ${status})
      ON CONFLICT (bidder_no) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
    `;
  }
  console.log(`bidder_insight_status: ${bidderStatusEntries.length} rows upserted`);

  // --- offtaker_ai_data ---
  const offtakerEntries = Object.entries(offtakerInsights);
  for (const [no, insights] of offtakerEntries) {
    await sql`
      INSERT INTO offtaker_ai_data (offtaker_no, ai_insights)
      VALUES (${parseInt(no)}, ${insights || ''})
      ON CONFLICT (offtaker_no) DO UPDATE SET ai_insights = EXCLUDED.ai_insights, updated_at = NOW()
    `;
  }
  console.log(`offtaker_ai_data: ${offtakerEntries.length} rows upserted`);

  // --- offtaker_insight_status ---
  const offtakerStatusEntries = Object.entries(offtakerStatus);
  for (const [no, status] of offtakerStatusEntries) {
    await sql`
      INSERT INTO offtaker_insight_status (offtaker_no, status)
      VALUES (${parseInt(no)}, ${status})
      ON CONFLICT (offtaker_no) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
    `;
  }
  console.log(`offtaker_insight_status: ${offtakerStatusEntries.length} rows upserted`);

  console.log('\nMigration complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
