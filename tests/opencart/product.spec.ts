import { test, expect } from '../../fixtures/base.fixture';

/**
 * https://www.opencart.com/index.php?route=marketplace/extension/info —
 * a single extension/theme's detail page.
 *
 * Extension IDs below are pinned to specific, long-lived Marketplace
 * listings (confirmed live) rather than clicked-through from a search/
 * "Featured" result, so this suite doesn't depend on ordering that changes
 * over time (Featured rotation, Recently Updated, etc).
 */
const FREE_EXTENSION_ID = 32336; // "Facebook for OpenCart" — FREE
const PAID_EXTENSION_ID = 21842; // "Pro Email Template" — $49.00

test.describe('Extension detail page', () => {
  test('shows a Download action, and no Buy button, for a free extension', { tag: '@regression' }, async ({
    productPage,
  }) => {
    await productPage.open(FREE_EXTENSION_ID);

    await expect(productPage.heading).toHaveText('Facebook for OpenCart');
    await expect(productPage.downloadLink).toBeVisible();
    await expect(productPage.buyButton).toHaveCount(0);
  });

  // The one @smoke pick for this file: proves a product detail page renders
  // (heading, price, and its primary commercial CTA) — chosen over the free
  // -extension variant because it exercises one extra element (price).
  test('shows a Buy button and price for a commercial extension', { tag: '@smoke' }, async ({ productPage }) => {
    await productPage.open(PAID_EXTENSION_ID);

    await expect(productPage.heading).toHaveText('Pro Email Template');
    await expect(productPage.buyButton).toBeVisible();
    await expect(productPage.priceValue).toContainText('$49.00');
  });

  test('prompts a signed-out visitor to log in before leaving a comment', { tag: '@regression' }, async ({
    productPage,
  }) => {
    await productPage.open(PAID_EXTENSION_ID);

    await expect(productPage.loginToCommentLink).toBeVisible();
  });
});
