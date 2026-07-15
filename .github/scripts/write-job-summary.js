#!/usr/bin/env node
/**
 * Writes a quick pass/fail/skip/flaky summary table to the GitHub Actions
 * job summary, so a reviewer gets the headline numbers on the run's
 * Summary page without downloading the HTML report artifact first.
 *
 * Uses the JSON reporter's top-level `stats` (see playwright.config.ts) —
 * Playwright already tallies `expected`/`unexpected`/`skipped`/`flaky`
 * there; no need to recompute it by hand.
 */
const fs = require('node:fs');

const resultsPath = process.argv[2] ?? 'reports/results.json';

if (!fs.existsSync(resultsPath)) {
  console.log(`No ${resultsPath} found — skipping job summary.`);
  process.exit(0);
}

const { stats } = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const durationSeconds = ((stats.duration ?? 0) / 1000).toFixed(1);

const summary = `### Playwright results

| Passed | Failed | Skipped | Flaky | Duration |
|---|---|---|---|---|
| ${stats.expected ?? 0} | ${stats.unexpected ?? 0} | ${stats.skipped ?? 0} | ${stats.flaky ?? 0} | ${durationSeconds}s |

Full HTML report, JUnit results, and traces/screenshots/videos for any
failures are attached as artifacts on this run's Summary page.
`;

console.log(summary);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}
