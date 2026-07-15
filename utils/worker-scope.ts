import type { TestInfo } from '@playwright/test';

/**
 * Builds a value unique per worker + test run, so tests that need to create
 * their own data (a username, an order ID, a file name) never collide with
 * the same test running concurrently on another worker.
 *
 * This is a generic *uniqueness* helper, not a data factory — building
 * realistic domain fixtures/builders for your app under test is the
 * test-data-engineer's call. Reach for a dedicated fixture/builder module
 * once you have real entities to construct.
 */
export function uniqueId(prefix: string, testInfo: TestInfo): string {
  return `${prefix}-w${testInfo.parallelIndex}-${Date.now()}`;
}
