import { test, expect } from '../../fixtures/base.fixture';

/**
 * There is no conventional multi-item cart/checkout journey on this
 * OpenCart.com instance: navigating directly to `route=checkout/cart`
 * returns a 404 (confirmed live), and both the "Buy" and "Download" actions
 * on an extension's page redirect a signed-out visitor straight to the
 * login page instead of adding anything to a cart. These tests cover that
 * actual behavior in place of a conventional cart/checkout flow.
 *
 * Assertion scope note: these tests only assert on the *URL* landed on
 * after clicking Buy/Download, not on the login page's content/heading.
 * That's deliberate — `route=account/login` itself is behind a Cloudflare
 * bot challenge for fresh automated contexts (see the large comment at the
 * top of `account.spec.ts`, where the login/register *content* assertions
 * live and are `.skip`ped for that reason). The redirect-to-login behavior
 * asserted here is still real and independently meaningful: it's what
 * stands in for "add to cart" on this site.
 *
 * Known flakiness note: one manual run during exploration briefly hit that
 * same Cloudflare interstitial as an HTTP 403 instead of a clean redirect
 * response on this exact click — a re-run immediately after behaved
 * normally. That's genuine, external environment flakiness (not a broken
 * test), which is exactly what `retries` in `playwright.config.ts`
 * (CI-only) exists to absorb — see the config's comments. Do not "fix"
 * this with a manual wait.
 */
const FREE_EXTENSION_ID = 32336; // "Facebook for OpenCart"
const PAID_EXTENSION_ID = 21842; // "Pro Email Template"

test.describe('Buy / Download require authentication', () => {
  test('clicking Download while signed out redirects to the login page', { tag: '@regression' }, async ({
    productPage,
    page,
  }) => {
    await productPage.open(FREE_EXTENSION_ID);

    await productPage.download();

    await expect(page).toHaveURL(/route=account\/login/);
  });

  // The one @smoke pick for this file: this site's Buy → login redirect is
  // the closest thing it has to a "core checkout flow" (see the file-level
  // comment above) — Buy over Download since it's the commercial path.
  test('clicking Buy while signed out redirects to the login page', { tag: '@smoke' }, async ({
    productPage,
    page,
  }) => {
    await productPage.open(PAID_EXTENSION_ID);

    await productPage.buy();

    await expect(page).toHaveURL(/route=account\/login/);
  });
});
