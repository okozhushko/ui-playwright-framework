import { BasePage } from '../base.page';
import { env } from '../../config/env';

/**
 * Shared base for every www.opencart.com Page Object.
 *
 * The rest of this repo's example suite (`tests/example/`) targets
 * the-internet.herokuapp.com via the single global `baseURL` configured in
 * playwright.config.ts. OpenCart.com is a second, unrelated site under test
 * here, so rather than repurposing that shared `baseURL` (which would break
 * the example suite's relative `goto('/login')` calls), every OpenCart page
 * builds an absolute URL from `env.opencart.baseURL`. Playwright navigates
 * to a full absolute URL regardless of the configured `baseURL`, so both
 * suites coexist without interfering with each other.
 */
export class OpenCartBasePage extends BasePage {
  protected async gotoPath(path: string): Promise<void> {
    await this.page.goto(`${env.opencart.baseURL}${path}`);
  }
}
