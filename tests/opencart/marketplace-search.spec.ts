import { test, expect } from '../../fixtures/base.fixture';

/**
 * https://www.opencart.com/index.php?route=marketplace/extension — search,
 * category filtering and sorting on the extension/theme "product listing".
 */
test.describe('Marketplace search and filters', () => {
  test.beforeEach(async ({ marketplacePage }) => {
    await marketplacePage.goto();
  });

  // The one @smoke pick for this file: proves the core Marketplace search
  // flow (this site's "product catalog" search) actually returns results.
  test('searching for a known term returns matching extensions', { tag: '@smoke' }, async ({
    marketplacePage,
    page,
  }) => {
    await marketplacePage.search('SEO');

    await expect(page).toHaveURL(/filter_search=SEO/);
    await expect(marketplacePage.resultLinks.first()).toBeVisible();
  });

  test('searching for a term with no matches returns zero results', { tag: '@regression' }, async ({ marketplacePage }) => {
    // Confirmed live: OpenCart.com renders no "no results" message for a
    // search with zero matches — the result grid (and its "Featured"
    // heading) is simply omitted. Asserting on the absence of result links
    // is the only reliable signal available here.
    await marketplacePage.search('zzzznonexistentextensionxyz');

    await expect(marketplacePage.resultLinks).toHaveCount(0);
  });

  test('filtering by the Themes category scopes the result set', { tag: '@regression' }, async ({
    marketplacePage,
    page,
  }) => {
    await marketplacePage.filterByCategory('Themes');

    await expect(page).toHaveURL(/filter_category_id=1/);
    await expect(marketplacePage.resultLinks.first()).toBeVisible();
  });

  test('sorting by Name updates the sort order in the URL', { tag: '@regression' }, async ({ marketplacePage, page }) => {
    await marketplacePage.sortBy('Name');

    await expect(page).toHaveURL(/sort=name/);
  });
});
