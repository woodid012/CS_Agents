const fs = require('fs');
const path = require('path');
const { parseExcel } = require('../lib/parseExcel');

// Read AI insights
const aiInsightsPath = path.join(__dirname, '../data/ai-insights.json');
const aiInsights = JSON.parse(fs.readFileSync(aiInsightsPath, 'utf-8'));

// Get CS insights from Excel
const bidders = parseExcel();
const csInsights = {};
bidders.forEach(b => {
  if (b.commentary) {
    csInsights[String(b.no)] = b.commentary;
  }
});

console.log(`Loaded ${Object.keys(aiInsights).length} AI insights`);
console.log(`Loaded ${Object.keys(csInsights).length} CS insights`);

// Task 1: Clean AI insights - remove "Name — " prefix
const cleanedAiInsights = {};
Object.entries(aiInsights).forEach(([key, value]) => {
  // Remove the "Name — " prefix pattern
  const cleaned = value.replace(/^[^—]+—\s*/, '');
  cleanedAiInsights[key] = cleaned;
});

// Write cleaned AI insights back to the original file
fs.writeFileSync(aiInsightsPath, JSON.stringify(cleanedAiInsights, null, 2), 'utf-8');
console.log(`\n✓ Cleaned ${Object.keys(cleanedAiInsights).length} AI insights (removed name prefixes)`);

// Task 2: Generate merged insights
const mergedInsights = {};

Object.keys(cleanedAiInsights).forEach(key => {
  const ai = cleanedAiInsights[key] || '';
  const cs = csInsights[key] || '';

  if (!ai && !cs) {
    mergedInsights[key] = '';
    return;
  }

  // If only one source exists, use it with potential trimming
  if (!ai) {
    const sentences = cs.split(/\.\s+/).filter(s => s.trim());
    let result = sentences.slice(0, 2).join('. ');
    if (!result.endsWith('.')) result += '.';
    mergedInsights[key] = result.replace(/\.{2,}/g, '.');
    return;
  }
  if (!cs || cs.trim() === '...' || cs.trim().length < 5) {
    const sentences = ai.split(/\.\s+/).filter(s => s.trim());
    let result = sentences.slice(0, 3).join('. ');
    if (!result.endsWith('.')) result += '.';
    mergedInsights[key] = result.replace(/\.{2,}/g, '.');
    return;
  }

  // Both exist - create intelligent merge
  let merged = '';

  // Priority status assessments from AI (first few words)
  const statusPatterns = [
    /^Very active/i,
    /^Active/i,
    /^Major/i,
    /^Dominant/i,
    /^SUGGEST UPGRADE/i,
    /^SUGGEST TIER/i,
    /^ACQUIRED/i,
    /^BEING ACQUIRED/i,
    /^FIRB risk/i,
    /^HIGH FIRB RISK/i,
    /^Low priority/i,
    /^Limited/i,
    /^Unlikely/i,
    /^No recent/i,
    /^Now owned/i,
  ];

  // Extract status from AI
  let statusTag = '';
  for (const pattern of statusPatterns) {
    if (pattern.test(ai)) {
      const match = ai.match(pattern);
      statusTag = match[0].trim();
      break;
    }
  }

  // Build combined insight
  const parts = [];

  // Add status tag if exists
  if (statusTag) {
    parts.push(statusTag);
  }

  // Get key info from AI (prefer first 1-2 sentences with substance)
  const aiSentences = ai.split(/\.\s+/).filter(s => s.trim().length > 15);
  let aiCore = '';

  if (aiSentences.length > 0) {
    // Skip first sentence if it's just the status we already captured
    let startIdx = 0;
    if (statusTag && aiSentences[0].includes(statusTag)) {
      const remainder = aiSentences[0].replace(statusTag, '').trim();
      if (remainder.length > 20) {
        aiCore = remainder;
      }
      startIdx = 1;
    }

    if (!aiCore && startIdx < aiSentences.length) {
      aiCore = aiSentences[startIdx];
    }
  }

  if (aiCore) {
    parts.push(aiCore);
  }

  // Add CS insight if it provides unique value
  const csSentences = cs.split(/\.\s+/).filter(s => s.trim().length > 15);
  if (csSentences.length > 0) {
    const csFirst = csSentences[0];
    const aiLower = ai.toLowerCase();
    const csLower = csFirst.toLowerCase();

    // Keywords that indicate valuable CS info
    const valueKeywords = ['want', 'interested', 'looking', 'preference', 'mandate', 'focus',
                          'appetite', 'indicated', 'exclusively', 'only', 'minimum', 'would need'];
    const hasUniqueValue = valueKeywords.some(kw => csLower.includes(kw) && !aiLower.includes(kw));

    // Also include if CS is substantive and AI is brief
    if (hasUniqueValue || (ai.length < 100 && cs.length > 30)) {
      parts.push(csFirst);
    }
  }

  // Combine sentences with proper spacing
  merged = parts.join('. ').trim();

  // If nothing built, fallback to AI
  if (!merged || merged === '.') {
    merged = ai;
  }

  // Clean up extra spaces first
  merged = merged.replace(/\s+/g, ' ').trim();

  // Ensure proper sentence ending
  if (!merged.endsWith('.')) {
    merged += '.';
  }

  // Limit to ~250 chars / 3 sentences
  if (merged.length > 250) {
    const sentences = merged.split(/\.\s+/).filter(s => s.trim());
    merged = sentences.slice(0, 3).join('. ');
    if (!merged.endsWith('.')) {
      merged += '.';
    }
  }

  // Final cleanup - remove any double/triple periods and extra spaces
  merged = merged.replace(/\.{2,}/g, '.').replace(/\s+/g, ' ').trim();

  mergedInsights[key] = merged;
});

// Write merged insights
const mergedInsightsPath = path.join(__dirname, '../data/merged-insights.json');
fs.writeFileSync(mergedInsightsPath, JSON.stringify(mergedInsights, null, 2), 'utf-8');
console.log(`✓ Generated ${Object.keys(mergedInsights).length} merged insights`);

// Show some examples
console.log('\n--- Sample merged insights ---');
const samples = ['3', '5', '15', '40', '75', '94'];
samples.forEach(key => {
  if (mergedInsights[key]) {
    console.log(`\n#${key}:`);
    console.log(`  CS: ${(csInsights[key] || '').substring(0, 80)}...`);
    console.log(`  AI: ${(cleanedAiInsights[key] || '').substring(0, 80)}...`);
    console.log(`  Merged: ${mergedInsights[key]}`);
  }
});

console.log('\n✓ Done! Files updated:');
console.log('  - data/ai-insights.json (cleaned)');
console.log('  - data/merged-insights.json (new)');
