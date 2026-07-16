import { test, expect } from '../../fixtures/base.fixture';

/**
 * Regression coverage for `OpenCartBasePage.assertNotRateLimited`.
 *
 * www.opencart.com is fronted by Cloudflare with real, documented per-IP
 * rate limiting: a request over the threshold gets an HTTP 429 "Error 1015
 * / You are being rate limited" interstitial instead of the real page.
 * Confirmed live in `reports/test-results/` failure artifacts (e.g. Ray ID
 * a1c2b50c1da7eed5, 2026-07-16 17:25:37 UTC) and reproduced directly by
 * running the OpenCart suite with several parallel workers.
 *
 * Deterministically reproduced here via `page.route()` (rather than waiting
 * for the live rate limit to recur) so this doesn't depend on live network
 * conditions — it exercises the *handling*, not the live limiter itself.
 */
test.describe('Cloudflare rate-limit handling', () => {
  // The one @smoke pick for this file: this is the rate-limit guard itself
  // (`OpenCartBasePage.assertNotRateLimited`) — high-value and fast since
  // it's mocked, not dependent on the live limiter actually tripping.
  test('gotoPath fails fast with a clear message on an HTTP 429, instead of a misleading locator timeout', { tag: '@smoke' }, async ({
    page,
    openCartHomePage,
  }) => {
    await page.route('**/index.php?route=common/home', (route) =>
      route.fulfill({
        status: 429,
        contentType: 'text/html',
        body: '<html><body><h1>Error 1015</h1><h2>You are being rate limited</h2></body></html>',
      })
    );

    await expect(openCartHomePage.goto()).rejects.toThrow(
      /Blocked by Cloudflare rate limiting \(HTTP 429\)/
    );
  });

  test('gotoPath does not throw on a normal, non-429 response', { tag: '@regression' }, async ({ page, marketplacePage }) => {
    await page.route('**/index.php?route=marketplace/extension', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>ok</body></html>',
      })
    );

    await expect(marketplacePage.goto()).resolves.toBeUndefined();
  });
});
