#!/usr/bin/env node
/**
 * Writes a quick pass/fail/skip/flaky summary table to the GitHub Actions
 * job summary, so a reviewer gets the headline numbers on the run's
 * Summary page without downloading the HTML report artifact first.
 *
 * Uses the JSON reporter's top-level `stats` (see playwright.config.ts) via
 * the shared summarizer in lib/results-summary.js — append-test-history.js
 * needs the exact same numbers for its own record, so the counting logic
 * lives in one place rather than two independently-drifting readers of the
 * same file.
 */
const fs = require('node:fs');
const { readJsonReport, summarize } = require('./lib/results-summary');

const resultsPath = process.argv[2] ?? 'reports/results.json';

const report = readJsonReport(resultsPath);
if (!report) {
  console.log(`No ${resultsPath} found — skipping job summary.`);
  process.exit(0);
}

const { passed, failed, skipped, flaky, durationMs } = summarize(report);
const durationSeconds = (durationMs / 1000).toFixed(1);

const summary = `### Playwright results

| Passed | Failed | Skipped | Flaky | Duration |
|---|---|---|---|---|
| ${passed} | ${failed} | ${skipped} | ${flaky} | ${durationSeconds}s |

Full HTML report, JUnit results, and traces/screenshots/videos for any
failures are attached as artifacts on this run's Summary page.
`;

console.log(summary);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}
