import { test } from '@playwright/test';
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
   * The price value itself (e.g. "$49.00"), not the whole "Price" panel.
   * The panel (`#price`) is a two-column Bootstrap row — a "Price" label
   * next to the value — and asserting against the *whole row* pulls in the
   * label text plus all the whitespace/newlines between the two columns,
   * which turns a test failure's diff into an unreadable wall of blank
   * space (confirmed live). Scoping to `#price` and filtering by content
   * (text starting with `$`) instead keeps the locator to exactly the
   * value under test, so a mismatch prints one clean line, not several.
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
    this.priceValue = page.locator('#price').getByText(/^\$/);
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
    await test.step('Click Buy', async () => {
      await this.buyButton.click();
    });
  }

  /** Same auth-gated behavior as `buy()`, for free extensions. */
  async download(): Promise<void> {
    await test.step('Click Download', async () => {
      await this.downloadLink.click();
    });
  }
}
