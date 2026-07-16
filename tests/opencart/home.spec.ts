import { test, expect } from '../../fixtures/base.fixture';

/**
 * https://www.opencart.com/ — homepage smoke coverage + primary navigation.
 * See `pages/opencart/home.page.ts` for why this domain's "homepage" is a
 * marketing page rather than a product catalog front page.
 */
test.describe('OpenCart.com homepage', () => {
  test.beforeEach(async ({ openCartHomePage }) => {
    await openCartHomePage.goto();
  });

  // The one @smoke pick for this file: confirms the homepage itself loads
  // and its primary nav is intact — the fastest possible signal that this
  // production site hasn't fundamentally changed shape.
  test('renders the hero heading and primary navigation', { tag: '@smoke' }, async ({
    openCartHomePage,
  }) => {
    await expect(openCartHomePage.heroHeading).toBeVisible();
    await expect(openCartHomePage.nav.featuresLink).toBeVisible();
    await expect(openCartHomePage.nav.marketplaceLink).toBeVisible();
    await expect(openCartHomePage.nav.loginLink).toBeVisible();
    await expect(openCartHomePage.nav.registerLink).toBeVisible();
  });

  test('navigates to the Marketplace via the top nav', { tag: '@regression' }, async ({
    openCartHomePage,
    marketplacePage,
    page,
  }) => {
    await openCartHomePage.nav.goToMarketplace();

    await expect(page).toHaveURL(/route=marketplace\/extension/);
    await expect(marketplacePage.heading).toBeVisible();
  });

  // Both tests below are skipped for the same reason documented at the top
  // of tests/opencart/account.spec.ts: `route=account/login` and
  // `route=account/register` serve a Cloudflare "Just a moment..." bot
  // challenge to every fresh, automated Playwright browser context on this
  // production site (confirmed reproducible, headless and headed, waiting
  // 20+ seconds) — not something a test fix or a longer wait can resolve.
  // eslint-disable-next-line playwright/no-skipped-test -- documented, unfixable Cloudflare bot-challenge, see the comment directly above.
  test.skip('navigates to the login page via the top nav', { tag: '@regression' }, async ({
    openCartHomePage,
    openCartLoginPage,
    page,
  }) => {
    await openCartHomePage.nav.goToLogin();

    await expect(page).toHaveURL(/route=account\/login/);
    await expect(openCartLoginPage.heading).toBeVisible();
  });

  // eslint-disable-next-line playwright/no-skipped-test -- documented, unfixable Cloudflare bot-challenge, see the comment above the previous test.
  test.skip('navigates to the register page via the top nav', { tag: '@regression' }, async ({
    openCartHomePage,
    openCartRegisterPage,
    page,
  }) => {
    await openCartHomePage.nav.goToRegister();

    await expect(page).toHaveURL(/route=account\/register/);
    await expect(openCartRegisterPage.heading).toBeVisible();
  });
});
