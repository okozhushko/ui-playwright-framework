import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { FlashMessageComponent } from './components/flash-message.component';

/**
 * https://the-internet.herokuapp.com/login
 *
 * Locators below were confirmed live via an accessibility snapshot
 * (Playwright MCP) against the running page before being written here —
 * not assumed from memory of the markup.
 */
export class LoginPage extends BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly heading: Locator;

  /** Shared banner region, composed rather than duplicated — see the component. */
  readonly flash: FlashMessageComponent;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByRole('textbox', { name: 'Username' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.heading = page.getByRole('heading', { name: 'Login Page' });
    this.flash = new FlashMessageComponent(page);
  }

  async goto(): Promise<void> {
    await super.goto('/login');
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
