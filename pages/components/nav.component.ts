import type { Locator, Page } from '@playwright/test';

/**
 * The persistent top navigation bar rendered on every www.opencart.com page
 * (the `banner`/`<header>` landmark). Composed by every OpenCart Page
 * Object instead of duplicating these locators — see `base.page.ts`'s
 * guidance to compose shared regions rather than force them into
 * inheritance.
 *
 * Scoped to the `banner` landmark deliberately: the page footer repeats an
 * identical "Login" link, and a product page separately has its own
 * "Download" link/button for the extension itself — confirmed live via an
 * accessibility snapshot that an unscoped `page.getByRole('link', { name:
 * 'Login' })` (or `'Download'`) resolves to more than one element in strict
 * mode.
 */
export class NavComponent {
  private readonly header: Locator;

  readonly featuresLink: Locator;
  readonly demoLink: Locator;
  readonly marketplaceLink: Locator;
  readonly blogLink: Locator;
  readonly downloadLink: Locator;
  readonly loginLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.header = page.getByRole('banner');
    this.featuresLink = this.header.getByRole('link', { name: 'Features' });
    this.demoLink = this.header.getByRole('link', { name: 'Demo' });
    this.marketplaceLink = this.header.getByRole('link', { name: 'Marketplace' });
    this.blogLink = this.header.getByRole('link', { name: 'Blog' });
    this.downloadLink = this.header.getByRole('link', { name: 'Download', exact: true });
    this.loginLink = this.header.getByRole('link', { name: 'Login', exact: true });
    this.registerLink = this.header.getByRole('link', { name: 'Register', exact: true });
  }

  async goToMarketplace(): Promise<void> {
    await this.marketplaceLink.click();
  }

  async goToLogin(): Promise<void> {
    await this.loginLink.click();
  }

  async goToRegister(): Promise<void> {
    await this.registerLink.click();
  }
}
