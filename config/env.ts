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
    baseURL: required('OPENCART_BASE_URL', 'https://www.opencart.com'),
  },
  isCI: process.env.CI === 'true' || process.env.CI === '1',
} as const;
