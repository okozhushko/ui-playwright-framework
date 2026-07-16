import { test as base, type Page } from '@playwright/test';
import { OpenCartHomePage } from '../pages/opencart/home.page';
import { MarketplacePage } from '../pages/opencart/marketplace.page';
import { ProductPage } from '../pages/opencart/product.page';
import { OpenCartLoginPage } from '../pages/opencart/login.page';
import { OpenCartRegisterPage } from '../pages/opencart/register.page';
import { ApiAuth } from '../utils/api-auth';
import { env } from '../config/env';

/**
 * Extends the base Playwright `test` with one fixture per Page Object, so
 * spec files consume `{ openCartHomePage }` instead of hand-rolling `new
 * OpenCartHomePage(page)` everywhere. Each fixture is created fresh per test
 * (default scope), which is what keeps tests independent and safe to run
 * `fullyParallel`.
 */
type Fixtures = {
  openCartHomePage: OpenCartHomePage;
  marketplacePage: MarketplacePage;
  productPage: ProductPage;
  openCartLoginPage: OpenCartLoginPage;
  openCartRegisterPage: OpenCartRegisterPage;
  authenticatedPage: Page;
};

export const test = base.extend<Fixtures>({
  openCartHomePage: async ({ page }, use) => {
    await use(new OpenCartHomePage(page));
  },

  marketplacePage: async ({ page }, use) => {
    await use(new MarketplacePage(page));
  },

  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },

  openCartLoginPage: async ({ page }, use) => {
    await use(new OpenCartLoginPage(page));
  },

  openCartRegisterPage: async ({ page }, use) => {
    await use(new OpenCartRegisterPage(page));
  },

  authenticatedPage: async ({ page, request }, use) => {
    const apiAuth = new ApiAuth(request, env.baseURL);
    const cookies = await apiAuth.login(env.credentials.username, env.credentials.password);

    // Add session cookies to the page
    for (const [name, value] of Object.entries(cookies)) {
      await page.context().addCookies([
        {
          name,
          value,
          url: env.baseURL,
        },
      ]);
    }

    await use(page);
  },
});

export { expect } from '@playwright/test';
