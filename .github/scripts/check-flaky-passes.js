#!/usr/bin/env node
/**
 * Quality gate: flags any test that only passed after Playwright retried it.
 *
 * playwright.config.ts's own comment says it plainly: "A test that only
 * passes on retry is a bug, not a feature." This script is what actually
 * checks that on CI, by reading the JSON reporter's per-attempt results
 * (reports/results.json) rather than just the pass/fail summary line, which
 * hides retries entirely.
 *
 * Deliberately a warning annotation, not a hard failure: this suite targets
 * a real production site (opencart.com) behind Cloudflare, which has a
 * documented, external rate-limiting/flakiness risk (see README.md and
 * tests/opencart/cart-checkout.spec.ts) that `retries` legitimately exists
 * to absorb. Silently ignoring retries would hide real bugs; hard-failing
 * on every retry would also fail the build for that already-documented,
 * external cause. Surfacing it loudly (without blocking) is the middle
 * ground — tighten this to `process.exitCode = 1` once/if that external
 * flakiness source is resolved (e.g. an allowlisted CI IP).
 */
const fs = require('node:fs');

const resultsPath = process.argv[2] ?? 'reports/results.json';

if (!fs.existsSync(resultsPath)) {
  console.log(`No ${resultsPath} found — skipping flaky-pass check.`);
  process.exit(0);
}

const report = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

/** @type {{ title: string; file: string; attempts: number }[]} */
const flakyPasses = [];

function walkSuites(suites) {
  for (const suite of suites ?? []) {
    walkSuites(suite.suites);
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const attempts = test.results?.length ?? 0;
        const finalResult = test.results?.at(-1);
        if (attempts > 1 && finalResult?.status === 'passed') {
          flakyPasses.push({
            title: spec.title,
            file: spec.file ?? 'unknown file',
            attempts,
          });
        }
      }
    }
  }
}

walkSuites(report.suites);

if (flakyPasses.length === 0) {
  console.log('No tests needed a retry to pass. ✅');
  process.exit(0);
}

let summary = '### ⚠️ Tests that only passed after a retry\n\n';
summary += '| Test | File | Attempts |\n|---|---|---|\n';

for (const { title, file, attempts } of flakyPasses) {
  console.log(`::warning file=${file}::"${title}" only passed after ${attempts} attempt(s).`);
  summary += `| ${title} | ${file} | ${attempts} |\n`;
}

summary +=
  '\nA test that only passes on retry is a bug to investigate, not a pattern to accept — see `playwright.config.ts`.\n';

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}
