/**
 * Single source of truth for turning the JSON reporter's output
 * (reports/results.json — see playwright.config.ts) into the handful of
 * pass/fail/skip/flaky/duration numbers that more than one CI script needs
 * (write-job-summary.js and append-test-history.js, so far). Extracted here
 * instead of leaving each script to read `stats` off the report by hand, so
 * they can't quietly drift apart on what "passed" means as this repo's
 * usage of the JSON reporter evolves.
 *
 * Deliberately does NOT cover check-flaky-passes.js's per-test attempt walk
 * (`report.suites[].specs[].tests[].results[]`) — that script answers a
 * different question ("which specific tests only passed on retry"), not a
 * run-level count, so there's nothing to share there.
 */
const fs = require('node:fs');

/**
 * @param {string} resultsPath
 * @returns {object | null} the parsed JSON reporter output, or null if the
 *   file doesn't exist (e.g. the test run step never got far enough to
 *   write it).
 */
function readJsonReport(resultsPath) {
  if (!fs.existsSync(resultsPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
}

/**
 * @param {object | null} report parsed JSON reporter output (or null)
 */
function summarize(report) {
  const stats = report?.stats ?? {};
  const passed = stats.expected ?? 0;
  const failed = stats.unexpected ?? 0;
  const skipped = stats.skipped ?? 0;
  // Matches Playwright's own accounting: a flaky test (failed at least
  // once, then passed on a later retry) is tallied separately from
  // `expected`, not folded into it — see check-flaky-passes.js for the
  // per-test detail behind this number.
  const flaky = stats.flaky ?? 0;

  return {
    total: passed + failed + skipped + flaky,
    passed,
    failed,
    skipped,
    flaky,
    durationMs: stats.duration ?? 0,
  };
}

module.exports = { readJsonReport, summarize };
