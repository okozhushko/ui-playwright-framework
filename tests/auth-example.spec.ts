import { test, expect } from '../fixtures/base.fixture';

/**
 * Example tests using API-based authentication.
 * The `authenticatedPage` fixture automatically logs in via API,
 * so the page starts with an active session (cookies set).
 */
test.describe('Authenticated tests (login via API)', () => {
  test('user stays logged in after page refresh', async ({ authenticatedPage }) => {
    // Page is already logged in via API cookies
    await authenticatedPage.goto('/');

    // You should see the logout button or some indicator that you're logged in
    // (exact selectors depend on the site)
    const logoutButton = authenticatedPage.locator('a[href="/logout"]');
    await expect(logoutButton).toBeVisible();
  });

  test('can access protected page after login', async ({ authenticatedPage }) => {
    // Directly navigate to a protected page — normally redirects to login if not authenticated
    // With API login, we have valid cookies so this should work
    await authenticatedPage.goto('/secure');

    const heading = authenticatedPage.locator('h1');
    await expect(heading).toContainText('Secure Area');
  });

  test('can access dashboard', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    await expect(authenticatedPage).toHaveTitle(/Secure Area/);
  });
});
