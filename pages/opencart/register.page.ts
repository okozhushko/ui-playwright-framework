import { test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { OpenCartBasePage } from './opencart-base.page';
import { NavComponent } from '../components/nav.component';

/**
 * https://www.opencart.com/index.php?route=account/register
 *
 * Special handling — read before adding a submitting test here: the
 * "Register" button starts (and stays) `disabled` even once every required
 * field has a value; confirmed live that an image CAPTCHA challenge
 * ("Click or touch the <word>...", a fresh image each pageload) is injected
 * into the DOM at that point and must be solved to enable the button.
 * Because that challenge can't be solved deterministically, and this is
 * opencart.com's real production account system, this suite intentionally
 * never submits this form — see `tests/opencart/account.spec.ts` for what
 * is/isn't asserted and why.
 */
export class OpenCartRegisterPage extends OpenCartBasePage {
  readonly nav: NavComponent;
  readonly heading: Locator;
  readonly usernameInput: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly countrySelect: Locator;
  readonly passwordInput: Locator;

  /** Same responsive desktop/mobile duplicate-button pattern as `OpenCartLoginPage`. */
  readonly registerButton: Locator;

  /** Only present in the DOM after every required field has a value. */
  readonly captchaPrompt: Locator;

  constructor(page: Page) {
    super(page);
    this.nav = new NavComponent(page);
    this.heading = page.getByRole('heading', { name: 'Register for OpenCart account' });
    this.usernameInput = page.getByRole('textbox', { name: '* Username' });
    this.firstNameInput = page.getByRole('textbox', { name: '* First Name' });
    this.lastNameInput = page.getByRole('textbox', { name: '* Last Name' });
    this.emailInput = page.getByRole('textbox', { name: '* E-Mail' });
    this.countrySelect = page.getByRole('combobox', { name: '* Country' });
    this.passwordInput = page.getByRole('textbox', { name: '* Password' });
    this.registerButton = page.getByRole('button', { name: 'Register' }).first();
    this.captchaPrompt = page.getByText('Click or touch the');
  }

  async goto(): Promise<void> {
    await this.gotoPath('/index.php?route=account/register');
  }

  /** Fills every required field, deliberately stopping short of submitting. */
  async fillRequiredFields(details: {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    country: string;
    password: string;
  }): Promise<void> {
    await test.step(`Fill the registration form for "${details.username}"`, async () => {
      await this.usernameInput.fill(details.username);
      await this.firstNameInput.fill(details.firstName);
      await this.lastNameInput.fill(details.lastName);
      await this.emailInput.fill(details.email);
      await this.countrySelect.selectOption(details.country);
      await this.passwordInput.fill(details.password);
    });
  }
}
