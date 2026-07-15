import { test, expect } from '../../fixtures/base.fixture';
import { env } from '../../config/env';

/**
 * Example spec demonstrating the framework's conventions:
 * - Page Objects consumed via fixtures (`loginPage`, `secureAreaPage`), never
 *   constructed inline.
 * - Web-first assertions (`expect(locator)...`) instead of manual waits —
 *   there is no `waitForTimeout` anywhere in this suite.
 * - Each test is fully independent: it navigates and authenticates itself,
 *   so it can run in any order, on any worker, alongside any other test.
 */
test.describe('Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('renders the login form', async ({ loginPage }) => {
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('signs in with valid credentials and reaches the secure area', async ({
    loginPage,
    secureAreaPage,
  }) => {
    await loginPage.login(env.credentials.username, env.credentials.password);

    await expect(secureAreaPage.heading).toBeVisible();
    await expect(secureAreaPage.flash.container).toContainText('You logged into a secure area');
  });

  test('shows an error flash for invalid credentials', async ({ loginPage }) => {
    await loginPage.login('invalid-user', 'invalid-password');

    await expect(loginPage.flash.container).toContainText('Your username is invalid');
    // Still on the login page — no navigation happened.
    await expect(loginPage.heading).toBeVisible();
  });

  test('logs out back to the login page', async ({ loginPage, secureAreaPage }) => {
    await loginPage.login(env.credentials.username, env.credentials.password);
    await expect(secureAreaPage.heading).toBeVisible();

    await secureAreaPage.logout();

    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.flash.container).toContainText('You logged out');
  });
});
