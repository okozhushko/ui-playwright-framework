import { test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { OpenCartBasePage } from './opencart-base.page';
import { NavComponent } from '../components/nav.component';
import { AlertComponent } from '../components/alert.component';

/**
 * https://www.opencart.com/index.php?route=account/login
 *
 * Named `OpenCartLoginPage` (rather than `LoginPage`) to avoid colliding
 * with `pages/login.page.ts`, the unrelated the-internet.herokuapp.com
 * example Page Object of the same conceptual role.
 */
export class OpenCartLoginPage extends OpenCartBasePage {
  readonly nav: NavComponent;
  readonly alert: AlertComponent;
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;

  /**
   * The theme renders a desktop (`hidden-xs`) and a mobile
   * (`visible-xs-block`) submit button, both named "Login" — `.first()`
   * picks the one visible at a desktop viewport. Confirmed live: an
   * unscoped `getByRole('button', { name: 'Login' })` resolves to two
   * elements in strict mode.
   */
  readonly loginButton: Locator;

  readonly forgotPasswordLink: Locator;
  readonly createAccountLink: Locator;

  constructor(page: Page) {
    super(page);
    this.nav = new NavComponent(page);
    this.alert = new AlertComponent(page);
    this.heading = page.getByRole('heading', { name: 'Log in to your OpenCart account' });
    this.emailInput = page.getByRole('textbox', { name: 'Email', exact: true });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.loginButton = page.getByRole('button', { name: 'Login' }).first();
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot your password?' });
    this.createAccountLink = page.getByRole('link', { name: 'Create an OpenCart account' });
  }

  async goto(): Promise<void> {
    await this.gotoPath('/index.php?route=account/login');
  }

  async login(email: string, password: string): Promise<void> {
    await test.step(`Log in as "${email}"`, async () => {
      await this.emailInput.fill(email);
      await this.passwordInput.fill(password);
      await this.loginButton.click();
    });
  }
}
