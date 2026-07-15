import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { FlashMessageComponent } from './components/flash-message.component';

/**
 * https://the-internet.herokuapp.com/secure — the page a user lands on
 * after a successful login.
 */
export class SecureAreaPage extends BasePage {
  readonly heading: Locator;
  readonly logoutButton: Locator;
  readonly flash: FlashMessageComponent;

  constructor(page: Page) {
    super(page);
    // `exact: true` avoids matching the page's other heading, the subheader
    // "Welcome to the Secure Area..." (discovered via a live run — the
    // non-exact locator resolved to 2 elements in strict mode).
    this.heading = page.getByRole('heading', { name: 'Secure Area', exact: true });
    this.logoutButton = page.getByRole('link', { name: 'Logout' });
    this.flash = new FlashMessageComponent(page);
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
