/**
 * Centralized environment configuration.
 *
 * Loads variables from `.env` (see `.env.example` for the full list) and
 * exposes them as a single typed object so tests/page objects never read
 * `process.env` directly. Keeping this in one place makes it obvious what
 * environment surface the suite depends on.
 *
 * NOTE: generating/rotating real test-user credentials, per-environment
 * fixtures, or mocked backend data is the test-data-engineer's territory.
 * This file only wires up *where the values come from*, not what they are.
 */
import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

type TestEnvironment = 'dev' | 'stage' | 'prod';

/**
 * Which environment this run targets — set via `TEST_ENV=dev|stage|prod`
 * (defaults to `prod`). Exposed on `env` too, in case a test/reporter wants
 * to know/print which one it's running against.
 */
function resolveTestEnvironment(): TestEnvironment {
  const raw = (process.env.TEST_ENV ?? 'prod').toLowerCase();
  if (raw === 'dev' || raw === 'stage' || raw === 'prod') {
    return raw;
  }
  throw new Error(`Invalid TEST_ENV "${process.env.TEST_ENV}" — expected "dev", "stage", or "prod".`);
}

/**
 * Picks opencart.com's base URL for the selected `TEST_ENV`.
 *
 * OpenCart.com itself has no separate dev/stage/prod deployment of its
 * own — it's one real production site (see README.md's "OpenCart.com
 * suite" section) — so all three environments default to the same URL.
 * That's not a placeholder bug: it's what makes `TEST_ENV` work out of the
 * box for *this* project, while still being the real extensibility point a
 * team adapting this framework for an application that genuinely has
 * separate dev/stage/prod deployments would point at their real per
 * -environment URLs via `OPENCART_DEV_BASE_URL` / `OPENCART_STAGE_BASE_URL`
 * / `OPENCART_PROD_BASE_URL`.
 *
 * `OPENCART_BASE_URL`, if set, overrides all of the above — for a one-off
 * local run against an arbitrary URL without touching `TEST_ENV`.
 */
function resolveOpenCartBaseURL(testEnvironment: TestEnvironment): string {
  if (process.env.OPENCART_BASE_URL) {
    return process.env.OPENCART_BASE_URL;
  }

  const urlByEnvironment: Record<TestEnvironment, string> = {
    dev: required('OPENCART_DEV_BASE_URL', 'https://www.opencart.com'),
    stage: required('OPENCART_STAGE_BASE_URL', 'https://www.opencart.com'),
    prod: required('OPENCART_PROD_BASE_URL', 'https://www.opencart.com'),
  };

  return urlByEnvironment[testEnvironment];
}

const testEnvironment = resolveTestEnvironment();

export const env = {
  baseURL: required('BASE_URL', 'https://the-internet.herokuapp.com'),
  credentials: {
    // Demo credentials for the-internet.herokuapp.com/login sandbox.
    // Replace with `TEST_USER_*` env vars for a real application.
    username: process.env.TEST_USER_USERNAME ?? 'tomsmith',
    password: process.env.TEST_USER_PASSWORD ?? 'SuperSecretPassword!',
  },
  // A second, unrelated target under test (see pages/opencart/). Kept
  // separate from `baseURL` above rather than replacing it, so the
  // the-internet.herokuapp.com example suite keeps working unmodified —
  // OpenCart Page Objects build absolute URLs from this instead of relying
  // on Playwright's global `baseURL`.
  opencart: {
    testEnvironment,
    baseURL: resolveOpenCartBaseURL(testEnvironment),
  },
  isCI: process.env.CI === 'true' || process.env.CI === '1',
} as const;
