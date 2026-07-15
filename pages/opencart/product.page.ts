import type { Locator, Page } from '@playwright/test';
import { OpenCartBasePage } from './opencart-base.page';
import { NavComponent } from '../components/nav.component';

/**
 * https://www.opencart.com/index.php?route=marketplace/extension/info
 *
 * A single Marketplace extension/theme's detail page. Free extensions show
 * a "Download" link in place of a "Buy" button + price — which one renders
 * depends on the item's license, so both getters are exposed and a given
 * test only asserts on the one that applies to the extension it loaded.
 */
export class ProductPage extends OpenCartBasePage {
  readonly nav: NavComponent;

  /**
   * The page renders two `level=3` headings: the product title, then later
   * "What customers say about <name>" above the review list. `.first()`
   * picks the title — confirmed live via an accessibility snapshot and by
   * reading `document.querySelectorAll('h3')` directly.
   */
  readonly heading: Locator;

  /** Only present on commercial (paid) extensions. */
  readonly buyButton: Locator;

  /**
   * The "Price" panel next to `buyButton` (e.g. "$49.00"). Purely
   * presentational text with no accessible role/label of its own, so this
   * falls back to the theme's `#price` id — confirmed live it's unique on
   * the page and only rendered alongside `buyButton`.
   */
  readonly priceValue: Locator;

  /**
   * Present on free extensions (in place of Buy). Matched by its `href`
   * (`route=marketplace/download`) rather than its accessible name — the
   * site nav also has a "Download" link (`route=cms/download`) with the
   * *exact same* accessible name, so an unscoped `getByRole('link', {
   * name: 'Download' })` resolves to two elements in strict mode. Confirmed
   * live.
   */
  readonly downloadLink: Locator;

  /** Shown to signed-out visitors in place of the comment form. */
  readonly loginToCommentLink: Locator;

  constructor(page: Page) {
    super(page);
    this.nav = new NavComponent(page);
    this.heading = page.getByRole('heading', { level: 3 }).first();
    this.buyButton = page.getByRole('button', { name: 'Buy' });
    this.priceValue = page.locator('#price');
    this.downloadLink = page.locator('a[href*="route=marketplace/download"]');
    this.loginToCommentLink = page.getByRole('link', { name: 'Login my OpenCart Account' });
  }

  /**
   * Named `open` rather than `goto`: unlike every other OpenCart Page
   * Object, this page needs a required `extensionId` argument, which isn't
   * a compatible override of `BasePage.goto(path?: string)` — kept as a
   * distinct method instead of fighting the base signature.
   */
  async open(extensionId: number | string): Promise<void> {
    await this.gotoPath(`/index.php?route=marketplace/extension/info&extension_id=${extensionId}`);
  }

  /**
   * Requires an authenticated session on the live site — confirmed live
   * that clicking this while signed out redirects straight to
   * `route=account/login` instead of adding the extension to a cart. There
   * is no separate `checkout/cart` route on this OpenCart.com instance (it
   * 404s): "Buy" stands in for cart/checkout here. See
   * `tests/opencart/cart-checkout.spec.ts`.
   */
  async buy(): Promise<void> {
    await this.buyButton.click();
  }

  /** Same auth-gated behavior as `buy()`, for free extensions. */
  async download(): Promise<void> {
    await this.downloadLink.click();
  }
}
