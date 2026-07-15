import type { Page } from '@playwright/test';

/**
 * Shared behavior for every Page Object.
 *
 * Deliberately thin: navigation helpers and generic getters only. No
 * assertions live here — assertions belong in the test file, not the Page
 * Object, so a failure message points at the test's intent rather than a
 * buried helper.
 *
 * Extend this class for page-level objects. For a UI region reused *across*
 * several pages (nav bar, footer, a modal), compose a `<Name>Component`
 * instead of inheriting — see `pages/components/nav.component.ts`.
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  /** Navigates relative to `baseURL` configured in playwright.config.ts. */
  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  getCurrentUrl(): string {
    return this.page.url();
  }

  async reload(): Promise<void> {
    await this.page.reload();
  }
}
