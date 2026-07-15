import { defineConfig, devices } from '@playwright/test';
import { env } from './config/env';

/**
 * See https://playwright.dev/docs/test-configuration for the full reference.
 *
 * Key decisions, explained:
 * - `fullyParallel: true` is the default posture — tests/files run in parallel
 *   by default. If a spec genuinely needs shared state, opt it into
 *   `test.describe.configure({ mode: 'serial' })` locally and treat that as a
 *   smell to fix, not a pattern to spread.
 * - `retries` are CI-only. A test that only passes on retry is a bug, not a
 *   feature; retries exist to absorb real environment flakiness (network
 *   blips, slow CI runners), not to hide broken tests.
 * - `trace`/`screenshot`/`video` are captured "on-first-retry" /
 *   "only-on-failure" so CI artifacts stay small but a failure is always
 *   debuggable via `npx playwright show-trace`.
 * - All reporter/output artifacts are routed under `reports/` per the
 *   project's directory convention, instead of the tool defaults
 *   (`playwright-report/`, `test-results/`) scattered at the repo root.
 */
export default defineConfig({
  testDir: './tests',

  // Fail the build on CI if someone accidentally left `test.only` in.
  forbidOnly: env.isCI,

  // Absorb genuine CI flakiness only — never mask a broken test locally.
  retries: env.isCI ? 2 : 0,

  // Undefined lets Playwright pick a sensible default per machine; CI runners
  // are often constrained, so cap workers there to avoid resource starvation.
  workers: env.isCI ? '50%' : undefined,

  fullyParallel: true,

  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },

  reporter: [
    // A from-scratch terminal reporter instead of the built-in `list` — see
    // its own doc comment (reporters/custom-reporter.ts) for exactly why:
    // in short, `list` repeats the same test identity across its live line
    // and its final failure summary, and always prints Expected/Received
    // *before* the source code frame, and neither of those is configurable
    // via `list`'s own reporter options.
    ['./reporters/custom-reporter.ts'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['junit', { outputFile: 'reports/junit/results.xml' }],
    // Structured per-test attempt data — consumed by the CI "flag flaky
    // passes" quality gate (.github/workflows/playwright.yml), which reads
    // this to find any test that only passed after a retry. Not meant for
    // humans; the custom/html reporters above are.
    ['json', { outputFile: 'reports/results.json' }],
  ],
  outputDir: 'reports/test-results',

  use: {
    baseURL: env.baseURL,

    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
