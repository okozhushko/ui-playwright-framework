import type { Locator, Page } from '@playwright/test';

/**
 * The Bootstrap alert banner www.opencart.com renders for account
 * form-level feedback (e.g. "No match for E-Mail and/or Password." after a
 * failed login submit).
 *
 * Locator note: the banner is a generic `<div class="alert alert-danger">`
 * with no accessible role or label (confirmed live — `getAttribute('role')`
 * is `null` on the element), so `.alert-danger` is used deliberately as a
 * last resort here, the same pragmatic choice `flash-message.component.ts`
 * makes for the-internet.herokuapp.com's `#flash` banner.
 */
export class AlertComponent {
  readonly container: Locator;
  readonly dismissButton: Locator;

  constructor(page: Page) {
    this.container = page.locator('.alert-danger');
    this.dismissButton = this.container.getByRole('button');
  }

  async getText(): Promise<string> {
    return (await this.container.innerText()).trim();
  }

  async dismiss(): Promise<void> {
    await this.dismissButton.click();
  }
}
