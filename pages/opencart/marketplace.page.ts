import type { Locator, Page } from '@playwright/test';
import { OpenCartBasePage } from './opencart-base.page';
import { NavComponent } from '../components/nav.component';

/**
 * https://www.opencart.com/index.php?route=marketplace/extension
 *
 * The Marketplace listing is this site's "product catalog" equivalent —
 * search, category filters, sorting, and paginated result cards, one per
 * extension or theme.
 */
export class MarketplacePage extends OpenCartBasePage {
  readonly nav: NavComponent;
  readonly heading: Locator;

  /**
   * Unlabeled `<input name="filter_search">` — confirmed live (via an
   * accessibility snapshot + DOM inspection) that this specific input has
   * no placeholder, aria-label, or associated `<label>`. The near-identical
   * search box rendered on `ProductPage` *does* expose one via
   * `placeholder="Search for extensions and themes"`, so that page uses
   * `getByPlaceholder` instead — this one falls back to a CSS attribute
   * selector on `name`, the pragmatic last resort.
   */
  readonly searchInput: Locator;

  /** Icon-only submit button next to `searchInput` — empty accessible name. */
  readonly searchButton: Locator;

  readonly sortBySelect: Locator;

  /**
   * Every result card's clean title link, e.g.
   * `<p><a href="...route=marketplace/extension/info...">Name</a></p>`.
   * Matched by href pattern rather than role/name: each card also wraps its
   * image in a *second* link to the same URL whose accessible name is the
   * entire truncated card blurb (description + title concatenated), not
   * just the title, so there's no clean per-card role/name to key off for
   * "give me all the result links" — confirmed live.
   */
  readonly resultLinks: Locator;

  constructor(page: Page) {
    super(page);
    this.nav = new NavComponent(page);
    this.heading = page.getByRole('heading', { name: 'Welcome to OpenCart Extension Store' });
    this.searchInput = page.locator('input[name="filter_search"]');
    this.searchButton = page.locator('#button-search');
    this.sortBySelect = page.getByLabel('Sort by');
    this.resultLinks = page.locator('p > a[href*="route=marketplace/extension/info"]');
  }

  async goto(): Promise<void> {
    await this.gotoPath('/index.php?route=marketplace/extension');
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchButton.click();
  }

  async sortBy(option: string): Promise<void> {
    await this.sortBySelect.selectOption(option);
  }

  /**
   * Filters by a sidebar category link, e.g. "Themes", "Modules". Restrict
   * calls to category names that are unique on the page — confirmed live
   * that "All" is ambiguous (it's also a license filter link elsewhere on
   * the same page), so don't route that value through here.
   */
  async filterByCategory(name: string): Promise<void> {
    await this.page.getByRole('link', { name, exact: true }).click();
  }

  /** The clean title link for a single result, by its exact visible name. */
  resultLink(name: string): Locator {
    return this.page.getByRole('link', { name, exact: true });
  }
}
