import type { Locator, Page } from '@playwright/test';
import { OpenCartBasePage } from './opencart-base.page';
import { NavComponent } from '../components/nav.component';

/**
 * https://www.opencart.com/ — the OpenCart.com marketing homepage.
 *
 * Note: opencart.com is itself an OpenCart storefront and doubles as the
 * Marketplace for extensions/themes (see `MarketplacePage` / `ProductPage`)
 * — there's no separate demo shop on this domain with a conventional
 * product catalog, so this homepage plays the role of the marketing/landing
 * page a visitor sees first, and the Marketplace plays the role of the
 * "product listing".
 */
export class OpenCartHomePage extends OpenCartBasePage {
  readonly nav: NavComponent;
  readonly heroHeading: Locator;
  readonly freeDownloadLink: Locator;
  readonly viewDemoLink: Locator;

  constructor(page: Page) {
    super(page);
    this.nav = new NavComponent(page);
    this.heroHeading = page.getByRole('heading', {
      name: 'The best open-source and FREE eCommerce platform',
    });
    this.freeDownloadLink = page.getByRole('link', { name: 'Free Download' });
    this.viewDemoLink = page.getByRole('link', { name: 'View Demo' });
  }

  async goto(): Promise<void> {
    await this.gotoPath('/index.php?route=common/home');
  }
}
