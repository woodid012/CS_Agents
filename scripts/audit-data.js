#!/usr/bin/env node
/**
 * audit-data.js
 * Data quality checker for CS Capital CRM.
 * Runs checks against the bidder Excel data, AI insights, contacts,
 * and market data JSON files. Prints a summary report.
 *
 * Usage: node scripts/audit-data.js [--verbose] [--json]
 */

const path = require('path');
const fs = require('fs');
const { parseExcel } = require('../lib/parseExcel');

const ROOT = path.join(__dirname, '..');
const VERBOSE = process.argv.includes('--verbose');
const JSON_OUT = process.argv.includes('--json');

// ─── helpers ────────────────────────────────────────────────────────────────

function loadJson(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function pct(n, total) {
  return total > 0 ? `${Math.round((n / total) * 100)}%` : '0%';
}

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function color(c, txt) { return JSON_OUT ? txt : `${c}${txt}${RESET}`; }
function ok(txt)   { return color(GREEN,  `  [OK]  ${txt}`); }
function warn(txt) { return color(YELLOW, `  [WARN] ${txt}`); }
function err(txt)  { return color(RED,    `  [ERR] ${txt}`); }
function info(txt) { return color(CYAN,   `  [INFO] ${txt}`); }
function hdr(txt)  { return color(BOLD,   `\n${txt}`); }

// ─── checks ─────────────────────────────────────────────────────────────────

function auditBidders(bidders) {
  const issues = [];
  const lines = [];

  lines.push(hdr(`BIDDER DATA (${bidders.length} records from Excel)`));

  // Required fields
  const REQUIRED = ['no', 'name', 'geography', 'tier', 'type'];
  const missingField = {};
  for (const b of bidders) {
    for (const f of REQUIRED) {
      if (!b[f] && b[f] !== 0) {
        missingField[f] = (missingField[f] || 0) + 1;
        if (VERBOSE) issues.push({ level: 'warn', msg: `Bidder #${b.no || '?'} missing field: ${f}` });
      }
    }
  }
  for (const [f, n] of Object.entries(missingField)) {
    lines.push(warn(`${n} bidder(s) missing required field: ${f}`));
  }
  if (Object.keys(missingField).length === 0) {
    lines.push(ok('All required fields present across all bidders'));
  }

  // Tier distribution
  const tierCounts = {};
  let untiered = 0;
  for (const b of bidders) {
    const t = Number(b.tier);
    if (t >= 1 && t <= 4) tierCounts[t] = (tierCounts[t] || 0) + 1;
    else untiered++;
  }
  lines.push(info(`Tier distribution: T1=${tierCounts[1] || 0}, T2=${tierCounts[2] || 0}, T3=${tierCounts[3] || 0}, T4=${tierCounts[4] || 0}, Untiered=${untiered}`));
  if (untiered > 0) {
    lines.push(warn(`${untiered} bidder(s) have no valid tier (1-4)`));
    if (VERBOSE) {
      bidders.filter(b => ![1,2,3,4].includes(Number(b.tier))).forEach(b => {
        issues.push({ level: 'warn', msg: `Bidder #${b.no} "${b.name}" has tier="${b.tier}"` });
      });
    }
  }

  // Type distribution
  const typeCounts = {};
  for (const b of bidders) {
    const t = b.type || 'Unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  const unknownType = typeCounts['Unknown'] || 0;
  lines.push(info(`Types: ${Object.entries(typeCounts).map(([k, v]) => `${k}(${v})`).join(', ')}`));
  if (unknownType > 0) lines.push(warn(`${unknownType} bidder(s) have unknown type`));

  // Geography distribution
  const geoCounts = {};
  for (const b of bidders) {
    const g = b.geography || 'Unknown';
    geoCounts[g] = (geoCounts[g] || 0) + 1;
  }
  const unknownGeo = geoCounts['Unknown'] || 0;
  lines.push(info(`${Object.keys(geoCounts).length} distinct geographies`));
  if (unknownGeo > 0) lines.push(warn(`${unknownGeo} bidder(s) have unknown geography`));

  // Duplicate names
  const nameCounts = {};
  for (const b of bidders) {
    const n = (b.name || '').toLowerCase().trim();
    nameCounts[n] = (nameCounts[n] || 0) + 1;
  }
  const dups = Object.entries(nameCounts).filter(([, c]) => c > 1);
  if (dups.length > 0) {
    dups.forEach(([n, c]) => lines.push(warn(`Duplicate name "${n}" appears ${c} times`)));
  } else {
    lines.push(ok('No duplicate bidder names'));
  }

  // No (sequence) gaps
  const nos = bidders.map(b => Number(b.no)).filter(n => !isNaN(n)).sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < nos.length; i++) {
    if (nos[i] - nos[i - 1] > 1) {
      for (let g = nos[i - 1] + 1; g < nos[i]; g++) gaps.push(g);
    }
  }
  if (gaps.length > 0) lines.push(warn(`Sequence gaps in bidder numbers: ${gaps.slice(0, 10).join(', ')}${gaps.length > 10 ? '...' : ''}`));
  else lines.push(ok('No gaps in bidder number sequence'));

  // Commentary coverage
  const noCommentary = bidders.filter(b => !b.commentary || b.commentary.trim() === '');
  lines.push(info(`CS commentary: ${bidders.length - noCommentary.length}/${bidders.length} bidders have commentary (${pct(bidders.length - noCommentary.length, bidders.length)})`));
  if (noCommentary.length > 0 && VERBOSE) {
    noCommentary.slice(0, 5).forEach(b => issues.push({ level: 'info', msg: `No commentary: #${b.no} "${b.name}"` }));
  }

  return { lines, issues };
}

function auditAiInsights(bidders) {
  const aiData = loadJson('data/ai-insights.json') || {};
  const aiTierScores = loadJson('data/ai-tier-scores.json') || {};
  const mergedInsights = loadJson('data/merged-insights.json') || {};
  const lines = [];

  lines.push(hdr('AI INSIGHTS DATA'));

  const bidderNos = bidders.map(b => String(b.no));
  const aiNos = Object.keys(aiData);
  const tierNos = Object.keys(aiTierScores);
  const mergedNos = Object.keys(mergedInsights);

  lines.push(info(`ai-insights.json: ${aiNos.length} entries`));
  lines.push(info(`ai-tier-scores.json: ${tierNos.length} entries`));
  lines.push(info(`merged-insights.json: ${mergedNos.length} entries`));

  const noAi = bidderNos.filter(n => !aiNos.includes(n));
  const noTier = bidderNos.filter(n => !tierNos.includes(n));
  const noMerged = bidderNos.filter(n => !mergedNos.includes(n));

  if (noAi.length > 0) lines.push(warn(`${noAi.length} bidder(s) missing AI insights: ${noAi.slice(0, 5).join(', ')}${noAi.length > 5 ? '...' : ''}`));
  else lines.push(ok('All bidders have AI insights'));

  if (noTier.length > 0) lines.push(warn(`${noTier.length} bidder(s) missing AI tier scores: ${noTier.slice(0, 5).join(', ')}${noTier.length > 5 ? '...' : ''}`));
  else lines.push(ok('All bidders have AI tier scores'));

  if (noMerged.length > 0) lines.push(warn(`${noMerged.length} bidder(s) missing merged insights`));
  else lines.push(ok('All bidders have merged insights'));

  // Score distribution
  const scoreDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, other: 0 };
  const labelDist = {};
  for (const [, v] of Object.entries(aiTierScores)) {
    const s = v.score;
    if ([1, 2, 3, 4, 5].includes(s)) scoreDist[s]++;
    else scoreDist.other++;
    const l = v.label || 'unknown';
    labelDist[l] = (labelDist[l] || 0) + 1;
  }
  lines.push(info(`AI scores: ${Object.entries(scoreDist).filter(([,v]) => v > 0).map(([k,v]) => `${k}:${v}`).join(', ')}`));
  lines.push(info(`AI labels: ${Object.entries(labelDist).map(([k,v]) => `${k}:${v}`).join(', ')}`));

  return { lines };
}

function auditContacts(bidders) {
  const contacts = loadJson('data/contacts.json') || {};
  const lines = [];

  lines.push(hdr('CONTACTS DATA'));
  lines.push(info(`contacts.json: ${Object.keys(contacts).length} entries`));

  const bidderNos = bidders.map(b => String(b.no));
  const contactNos = Object.keys(contacts);
  const noContact = bidderNos.filter(n => !contactNos.includes(n));
  const hasContact = bidderNos.filter(n => contactNos.includes(n));

  lines.push(info(`Contact coverage: ${hasContact.length}/${bidders.length} bidders (${pct(hasContact.length, bidders.length)})`));
  if (noContact.length > 0) {
    lines.push(warn(`${noContact.length} bidder(s) have no contact record`));
  }

  // Check contact quality
  let noEmail = 0, noName = 0;
  for (const [, c] of Object.entries(contacts)) {
    if (!c.email || c.email.trim() === '') noEmail++;
    if (!c.contact || c.contact.trim() === '') noName++;
  }
  if (noEmail > 0) lines.push(warn(`${noEmail} contact(s) missing email address`));
  else lines.push(ok('All contacts have email address'));
  if (noName > 0) lines.push(warn(`${noName} contact(s) missing contact name`));

  return { lines };
}

function auditMarketData() {
  const lines = [];
  lines.push(hdr('MARKET DATA FILES'));

  const auMarket = loadJson('data/australia-market.json');
  const capex = loadJson('data/capex-data.json');

  if (!auMarket) {
    lines.push(err('australia-market.json not found'));
  } else {
    lines.push(ok('australia-market.json present'));
    lines.push(info(`Major transactions: ${(auMarket.majorTransactions2024_2026 || []).length}`));
    lines.push(info(`Recent news items: ${(auMarket.recentNews || []).length}`));
    lines.push(info(`Domestic players: ${(auMarket.domesticPlayers || []).length}`));
    lines.push(info(`Key transmission projects: ${(auMarket.keyTransmission || []).length}`));
    if (!(auMarket.keyPolicy && auMarket.keyPolicy.capacityInvestmentScheme)) {
      lines.push(warn('Missing CIS policy data in australia-market.json'));
    } else {
      lines.push(ok('CIS policy data present'));
    }
  }

  if (!capex) {
    lines.push(err('capex-data.json not found'));
  } else {
    const investorCount = Object.keys(capex).filter(k => k !== '_notes' && k !== 'Global summary').length;
    lines.push(ok(`capex-data.json present: ${investorCount} investors tracked`));
    if (!capex['Global summary']) lines.push(warn('capex-data.json missing Global summary'));
  }

  // Check for stale notes
  if (auMarket && auMarket._notes) {
    lines.push(info(`Market data notes: "${auMarket._notes}"`));
  }

  return { lines };
}

function auditInsightStatus() {
  const lines = [];
  lines.push(hdr('INSIGHT STATUS'));

  const aiStatus = loadJson('data/ai-insights-status.json') || {};
  const offtakerStatus = loadJson('data/offtaker-insights-status.json') || {};

  lines.push(info(`ai-insights-status.json: ${Object.keys(aiStatus).length} entries`));
  lines.push(info(`offtaker-insights-status.json: ${Object.keys(offtakerStatus).length} entries`));

  const processed = Object.values(aiStatus).filter(v => v === 'done' || v === 'processed').length;
  const pending = Object.values(aiStatus).filter(v => v === 'pending' || v === false || v === null).length;
  if (Object.keys(aiStatus).length > 0) {
    lines.push(info(`AI insights status: ${processed} processed, ${pending} pending/unprocessed`));
  }

  return { lines };
}

// ─── main ────────────────────────────────────────────────────────────────────

function run() {
  let bidders;
  try {
    bidders = parseExcel();
  } catch (e) {
    console.error(err(`Failed to parse Excel: ${e.message}`));
    console.error(DIM + 'Make sure "Master Bidder Engagement List - CSC.xlsx" is present in the project root.' + RESET);
    process.exit(1);
  }

  const sections = [
    auditBidders(bidders),
    auditAiInsights(bidders),
    auditContacts(bidders),
    auditMarketData(),
    auditInsightStatus(),
  ];

  const allLines = [];
  const allIssues = [];
  for (const s of sections) {
    allLines.push(...s.lines);
    if (s.issues) allIssues.push(...s.issues);
  }

  // Summary
  const warns = allLines.filter(l => l.includes('[WARN]')).length;
  const errs  = allLines.filter(l => l.includes('[ERR]')).length;
  const oks   = allLines.filter(l => l.includes('[OK]')).length;

  allLines.push(hdr('SUMMARY'));
  allLines.push(color(GREEN,  `  OK:       ${oks}`));
  allLines.push(color(YELLOW, `  Warnings: ${warns}`));
  allLines.push(color(RED,    `  Errors:   ${errs}`));

  if (errs === 0 && warns === 0) {
    allLines.push(color(GREEN + BOLD, '\n  Data quality: CLEAN'));
  } else if (errs === 0) {
    allLines.push(color(YELLOW + BOLD, '\n  Data quality: WARNINGS ONLY'));
  } else {
    allLines.push(color(RED + BOLD, '\n  Data quality: ERRORS FOUND'));
  }

  if (JSON_OUT) {
    const report = {
      timestamp: new Date().toISOString(),
      bidderCount: bidders.length,
      ok: oks,
      warnings: warns,
      errors: errs,
      issues: allIssues,
    };
    console.log(JSON.stringify(report, null, 2));
  } else {
    if (VERBOSE && allIssues.length > 0) {
      allLines.push(hdr('VERBOSE ISSUES'));
      for (const issue of allIssues) {
        const fn = issue.level === 'warn' ? warn : issue.level === 'err' ? err : info;
        allLines.push(fn(issue.msg));
      }
    }
    console.log(allLines.join('\n'));
  }

  process.exit(errs > 0 ? 1 : 0);
}

run();
