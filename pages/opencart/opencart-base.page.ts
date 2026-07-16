import { test } from '@playwright/test';
import type { Response } from '@playwright/test';
import { BasePage } from '../base.page';
import { env } from '../../config/env';

/**
 * Shared base for every www.opencart.com Page Object.
 *
 * Builds an absolute URL from `env.opencart.baseURL` rather than relying on
 * Playwright's global `baseURL` (`playwright.config.ts`) — keeps this
 * suite's target independent of whatever `BASE_URL` a future, unrelated
 * suite in this repo might configure for itself.
 */
export class OpenCartBasePage extends BasePage {
  protected async gotoPath(path: string): Promise<void> {
    // Wrapped in a named step so a failure's last-printed step (visible
    // live in the console via the `list` reporter's `printSteps: true` —
    // see playwright.config.ts) always shows which page a test was
    // navigating to, not just a generic "test failed".
    await test.step(`Navigate to ${path}`, async () => {
      const response = await this.page.goto(`${env.opencart.baseURL}${path}`);
      this.assertNotRateLimited(response);
    });
  }

  /**
   * www.opencart.com is a production site fronted by Cloudflare with
   * documented per-IP rate limiting: exceed the threshold and Cloudflare
   * serves an HTTP 429 "Error 1015 / You are being rate limited"
   * interstitial in place of the real page — confirmed live via multiple
   * failure artifacts under `reports/test-results/` (e.g. Ray ID
   * a1c2b50c1da7eed5, 2026-07-16 17:25:37 UTC) and reproduced directly by
   * running this suite with several parallel workers against the live
   * site. `page.goto()` itself still resolves normally in that case (the
   * interstitial *is* a complete HTML response, just not the page under
   * test) — every downstream Page Object locator then times out with a
   * generic "element(s) not found", which is indistinguishable at a glance
   * from a genuinely broken selector.
   *
   * Failing fast here, right after navigation, converts that misleading
   * signature into an accurate one that names the real cause — so this
   * doesn't get "fixed" later by someone tweaking an unrelated locator or
   * bumping a timeout (confirmed via the trace network log that the
   * response itself is a 429; no amount of extra wait time changes that).
   * This does not change pass/fail outcome for a genuinely rate-limited
   * run — reducing test concurrency against this host, and CI-only
   * `retries` (see playwright.config.ts), remain the actual mitigations.
   */
  private assertNotRateLimited(response: Response | null): void {
    if (response?.status() === 429) {
      throw new Error(
        `Blocked by Cloudflare rate limiting (HTTP 429) while navigating to ${response.url()}. ` +
          'This is a known www.opencart.com environment condition (see OpenCartBasePage.assertNotRateLimited), ' +
          'not a broken selector or test bug. Re-run, or reduce concurrent workers/parallel runs against this host.'
      );
    }
  }
}
