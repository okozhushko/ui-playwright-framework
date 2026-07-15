import type { Locator, Page } from '@playwright/test';

/**
 * The flash/notification banner rendered on both the login page (errors) and
 * the secure area (success message) on the-internet.herokuapp.com.
 *
 * This is a textbook case for composition over inheritance: the banner is a
 * shared *region*, not a shared *page*, so it's instantiated by any Page
 * Object that renders it rather than being duplicated or forced into a base
 * class.
 *
 * Locator note: the banner has no accessible role/label (it's a generic
 * `<div id="flash">`), so `page.locator('#flash')` is used deliberately as a
 * last resort here — verified live against the running page, not guessed.
 */
export class FlashMessageComponent {
  readonly container: Locator;
  readonly dismissButton: Locator;

  constructor(page: Page) {
    this.container = page.locator('#flash');
    this.dismissButton = this.container.getByText('×');
  }

  async getText(): Promise<string> {
    return (await this.container.innerText()).trim();
  }

  async dismiss(): Promise<void> {
    await this.dismissButton.click();
  }
}
