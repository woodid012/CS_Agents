// Quick test to verify API data structure
const { parseExcel } = require('../lib/parseExcel');
const fs = require('fs');
const path = require('path');

function loadJson(filename) {
  const filePath = path.join(__dirname, '../data', filename);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

const bidders = parseExcel();
const insights = loadJson('ai-insights.json');
const mergedInsights = loadJson('merged-insights.json');
const contacts = loadJson('contacts.json');
const aiTiers = loadJson('ai-tier-scores.json');

console.log(`Loaded ${bidders.length} bidders from Excel`);
console.log(`Loaded ${Object.keys(insights).length} AI insights`);
console.log(`Loaded ${Object.keys(mergedInsights).length} merged insights`);

// Test a few bidders
const testBidders = [3, 5, 15, 40, 75, 94];
console.log('\nTest bidders:');
testBidders.forEach(no => {
  const bidder = bidders.find(b => b.no === no);
  if (bidder) {
    const result = {
      no: bidder.no,
      name: bidder.name,
      csInsights: bidder.commentary ? bidder.commentary.substring(0, 50) + '...' : '',
      aiInsights: (insights[String(no)] || '').substring(0, 50) + '...',
      mergedInsights: (mergedInsights[String(no)] || '').substring(0, 80) + '...',
    };
    console.log(`\n#${no} - ${bidder.name}:`);
    console.log(`  CS: ${result.csInsights}`);
    console.log(`  AI: ${result.aiInsights}`);
    console.log(`  Merged: ${result.mergedInsights}`);
  }
});

// Check for double periods in merged insights
console.log('\nChecking for formatting issues...');
let doublePeriods = 0;
Object.entries(mergedInsights).forEach(([key, value]) => {
  if (value.includes('..')) {
    doublePeriods++;
    console.log(`  Warning: Double period in #${key}: "${value.substring(0, 80)}..."`);
  }
});

if (doublePeriods === 0) {
  console.log('  ✓ No double periods found');
} else {
  console.log(`  Found ${doublePeriods} entries with double periods`);
}

console.log('\n✓ Test complete');
