import { test as base } from '@playwright/test';
import { OpenCartHomePage } from '../pages/opencart/home.page';
import { MarketplacePage } from '../pages/opencart/marketplace.page';
import { ProductPage } from '../pages/opencart/product.page';
import { OpenCartLoginPage } from '../pages/opencart/login.page';
import { OpenCartRegisterPage } from '../pages/opencart/register.page';

/**
 * Extends the base Playwright `test` with one fixture per Page Object, so
 * spec files consume `{ openCartHomePage }` instead of hand-rolling `new
 * OpenCartHomePage(page)` everywhere. Each fixture is created fresh per test
 * (default scope), which is what keeps tests independent and safe to run
 * `fullyParallel`.
 *
 * Auth/session shortcuts (e.g. a `storageState`-backed `authenticatedPage`
 * fixture via `globalSetup`) are intentionally NOT included here — wiring
 * that up is a test-data-engineer concern. Flag it if a suite needs one.
 */
type Fixtures = {
  openCartHomePage: OpenCartHomePage;
  marketplacePage: MarketplacePage;
  productPage: ProductPage;
  openCartLoginPage: OpenCartLoginPage;
  openCartRegisterPage: OpenCartRegisterPage;
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
});

export { expect } from '@playwright/test';
