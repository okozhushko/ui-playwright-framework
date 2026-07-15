import { test } from '@playwright/test';
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
      await this.page.goto(`${env.opencart.baseURL}${path}`);
    });
  }
}
