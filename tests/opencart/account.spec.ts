import { test, expect } from '../../fixtures/base.fixture';
import { uniqueId } from '../../utils/worker-scope';

/**
 * https://www.opencart.com/index.php?route=account/login and
 * .../route=account/register — opencart.com's real production account
 * system.
 *
 * There are no test credentials for this suite to log in with (unlike the
 * the-internet.herokuapp.com example, which ships a sandbox account) — this
 * is opencart.com's actual account system, so creating one for automated
 * runs isn't appropriate. Coverage here is therefore limited to what's safe
 * and deterministic to exercise against production: the invalid-credentials
 * error path, and the registration form up to (but never including) submit
 * — see `pages/opencart/register.page.ts` for why submission is
 * specifically out of scope (CAPTCHA-gated).
 *
 * KNOWN BLOCKER — both describe blocks below are marked `.skip`:
 * `route=account/login` and `route=account/register` serve a Cloudflare
 * "Just a moment..." bot-verification interstitial to every *fresh*
 * automated Playwright browser context on this production site — confirmed
 * reproducible outside this framework too (a standalone script launching
 * plain `chromium.launch({ headless: true })` and `{ headless: false }` and
 * navigating straight to `route=account/login` sat on the interstitial for
 * 20+ seconds in both modes; it never auto-clears the way a timed
 * JS-computation challenge would). This is specific to these two routes —
 * every other OpenCart.com page exercised by this suite (home, Marketplace,
 * product pages, and the Buy/Download → login *redirect* itself in
 * `cart-checkout.spec.ts`) loads normally in a fresh context.
 *
 * The Page Objects (`OpenCartLoginPage`, `OpenCartRegisterPage`) and every
 * locator below were still verified against the real rendered pages live,
 * through an already-authenticated interactive session (see each Page
 * Object's own doc comments) — this is an environment/bot-protection
 * limitation on fresh automated runs, not a locator or Page Object bug.
 * Unblocking this in CI would need infrastructure outside this suite's
 * scope (e.g. a pre-warmed `storageState`/`cf_clearance` cookie or an
 * allowlisted runner) — that's a test-data-engineer / infra concern to flag,
 * not something to work around here with a stealth/bot-evasion hack.
 */
test.describe.skip('Login', () => {
  test.beforeEach(async ({ openCartLoginPage }) => {
    await openCartLoginPage.goto();
  });

  test('renders the login form', async ({ openCartLoginPage }) => {
    await expect(openCartLoginPage.heading).toBeVisible();
    await expect(openCartLoginPage.emailInput).toBeVisible();
    await expect(openCartLoginPage.passwordInput).toBeVisible();
    await expect(openCartLoginPage.loginButton).toBeVisible();
  });

  test('shows an error alert for invalid credentials', async ({ openCartLoginPage }, testInfo) => {
    const email = `invalid-${uniqueId('user', testInfo)}@example.com`;

    await openCartLoginPage.login(email, 'not-the-right-password');

    await expect(openCartLoginPage.alert.container).toContainText(
      'No match for E-Mail and/or Password.'
    );
    // Still on the login page — no session was created.
    await expect(openCartLoginPage.heading).toBeVisible();
  });

  test('links to the registration page for visitors without an account', async ({
    openCartLoginPage,
    openCartRegisterPage,
    page,
  }) => {
    await openCartLoginPage.createAccountLink.click();

    await expect(page).toHaveURL(/route=account\/register/);
    await expect(openCartRegisterPage.heading).toBeVisible();
  });
});

test.describe.skip('Registration form', () => {
  test.beforeEach(async ({ openCartRegisterPage }) => {
    await openCartRegisterPage.goto();
  });

  test('renders every required field', async ({ openCartRegisterPage }) => {
    await expect(openCartRegisterPage.heading).toBeVisible();
    await expect(openCartRegisterPage.usernameInput).toBeVisible();
    await expect(openCartRegisterPage.firstNameInput).toBeVisible();
    await expect(openCartRegisterPage.lastNameInput).toBeVisible();
    await expect(openCartRegisterPage.emailInput).toBeVisible();
    await expect(openCartRegisterPage.countrySelect).toBeVisible();
    await expect(openCartRegisterPage.passwordInput).toBeVisible();
  });

  test('the Register button stays disabled until required fields are filled', async ({
    openCartRegisterPage,
  }) => {
    await expect(openCartRegisterPage.registerButton).toBeDisabled();
  });

  test('filling every required field surfaces the CAPTCHA gate instead of enabling submit', async ({
    openCartRegisterPage,
  }, testInfo) => {
    const id = uniqueId('pw-test', testInfo);

    await openCartRegisterPage.fillRequiredFields({
      username: id,
      firstName: 'Playwright',
      lastName: 'Test',
      email: `${id}@example.com`,
      country: 'United States',
      password: 'SuperSecret123!',
    });

    // The form deliberately never gets submitted (see the Page Object's
    // doc comment) — this confirms the CAPTCHA gate itself appears, and
    // that it — not a client-side validation bug — is what's keeping
    // Register disabled.
    await expect(openCartRegisterPage.captchaPrompt).toBeVisible();
    await expect(openCartRegisterPage.registerButton).toBeDisabled();
  });
});
