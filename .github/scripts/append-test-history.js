#!/usr/bin/env node
/**
 * Appends one record for this run to a persisted test-history file.
 *
 * `reports/` is git-ignored and rebuilt from scratch on every CI checkout
 * (see .gitignore) — a plain local file here can't accumulate anything
 * across runs by itself. This script only *appends into whatever history
 * file it's pointed at*; making that file survive across runs is a
 * separate concern handled by .github/scripts/publish-test-history.sh,
 * which runs this script against a checkout of the dedicated
 * `test-history` branch rather than a throwaway local path, then commits
 * the result. See README's "Test history dashboard" section for why that
 * branch exists instead of committing straight to `main`.
 *
 * Reuses the same stats extraction as write-job-summary.js
 * (lib/results-summary.js) so "what counts as passed" can't drift between
 * the two.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { readJsonReport, summarize } = require('./lib/results-summary');

// Caps unbounded growth of a file that's appended to on every run forever.
// A few hundred entries is already a long trend window for a dashboard that
// only ever needs to show recent history — the full per-run detail (logs,
// traces, artifacts) lives on the individual GitHub Actions run, not here.
const MAX_HISTORY_ENTRIES = 500;

const resultsPath = process.argv[2] ?? 'reports/results.json';
const historyPath = process.argv[3] ?? 'reports/history.json';

const report = readJsonReport(resultsPath);
if (!report) {
  console.log(`No ${resultsPath} found — skipping history append.`);
  process.exit(0);
}

function readExistingHistory() {
  if (!fs.existsSync(historyPath)) {
    return [];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.log(`Warning: ${historyPath} exists but isn't valid JSON — starting a fresh history.`);
    return [];
  }
}

function gitSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

function gitBranch() {
  // GITHUB_REF_NAME is e.g. "main"; falls back to a local git lookup for
  // running this script outside CI.
  if (process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME;
  try {
    return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

const summary = summarize(report);
const history = readExistingHistory();

history.push({
  timestamp: new Date().toISOString(),
  sha: gitSha(),
  branch: gitBranch(),
  // dev/stage/prod (see config/env.ts) — all three point at the same real
  // opencart.com URL today, but this keeps the history record honest about
  // which target a run said it was exercising.
  testEnv: process.env.TEST_ENV ?? 'prod',
  total: summary.total,
  passed: summary.passed,
  failed: summary.failed,
  skipped: summary.skipped,
  flaky: summary.flaky,
  durationMs: Math.round(summary.durationMs),
});

const trimmed = history.length > MAX_HISTORY_ENTRIES ? history.slice(history.length - MAX_HISTORY_ENTRIES) : history;

fs.mkdirSync(path.dirname(historyPath), { recursive: true });
fs.writeFileSync(historyPath, JSON.stringify(trimmed, null, 2) + '\n');

console.log(`Appended run to ${historyPath} (${trimmed.length} record(s) total).`);
