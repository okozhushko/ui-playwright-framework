# UI Playwright Framework

A production-ready skeleton for UI test automation with [Playwright Test](https://playwright.dev/) + TypeScript, using the Page Object Model.

The suite under `tests/opencart/` covers [opencart.com](https://www.opencart.com/) (see [OpenCart.com suite](#opencartcom-suite) below) as a real-world example — replace it with your own application's.

## Project structure

```
.
├── playwright.config.ts     # Test runner config: projects, timeouts, retries, reporters
├── tsconfig.json
├── .env.example              # Copy to .env and fill in real values
├── config/
│   └── env.ts                 # Single source of truth for env vars (baseURL, credentials, opencart.baseURL)
├── pages/
│   ├── base.page.ts           # BasePage: shared navigation helpers, no assertions
│   ├── components/
│   │   ├── nav.component.ts            # Shared region: opencart.com's top nav
│   │   └── alert.component.ts          # Shared region: opencart.com's .alert-danger banner
│   └── opencart/
│       ├── opencart-base.page.ts   # OpenCartBasePage: absolute-URL goto() for this site
│       ├── home.page.ts            # OpenCartHomePage
│       ├── marketplace.page.ts     # MarketplacePage — extension/theme search & listing
│       ├── product.page.ts         # ProductPage — a single extension/theme's detail page
│       ├── login.page.ts           # OpenCartLoginPage
│       └── register.page.ts        # OpenCartRegisterPage
├── fixtures/
│   └── base.fixture.ts        # test.extend(...) wiring Page Objects into fixtures
├── utils/
│   ├── api-auth.ts            # API-based authentication service for login via POST
│   └── worker-scope.ts        # Helper for per-worker-unique test data
├── reporters/
│   ├── custom-reporter.ts     # Terminal reporter used instead of the built-in `list` — see below
│   └── terminal-links.ts      # OSC 8 clickable-hyperlink helper, used by custom-reporter.ts
├── tests/
│   └── opencart/
│       ├── home.spec.ts               # Homepage + primary nav
│       ├── marketplace-search.spec.ts # Search, category filter, sort
│       ├── product.spec.ts            # Free vs. commercial extension detail pages
│       ├── cart-checkout.spec.ts      # Buy/Download → login redirect (this site's cart/checkout stand-in)
│       └── account.spec.ts            # Login/Register forms — see note below, currently `.skip`
└── reports/                    # Generated: HTML report, JUnit XML, traces, screenshots, video
```

## OpenCart.com suite

`tests/opencart/` targets [www.opencart.com](https://www.opencart.com/) — which turns out to itself be an OpenCart storefront (it sells extensions/themes via a "Marketplace"), so it doubles as a fuller product-catalog/detail/auth example than the-internet.herokuapp.com offers. A few real, live-verified quirks worth knowing before extending this suite:

- **No conventional cart/checkout.** `route=checkout/cart` 404s on this instance. "Buy" (commercial extensions) and "Download" (free ones) are the closest equivalents, and both simply redirect a signed-out visitor to the login page — see `cart-checkout.spec.ts`.
- **`route=account/login` and `route=account/register` are Cloudflare-challenge-gated for fresh automated browser contexts.** Confirmed reproducible outside this framework (a standalone script launching plain Chromium, headless and headed, sat on Cloudflare's "Just a moment..." interstitial for 20+ seconds without it clearing). `account.spec.ts` and two tests in `home.spec.ts` are marked `.skip` for this reason — see the large comment at the top of `account.spec.ts` for the full writeup. Every other page in this suite loads normally in a fresh context.
- **Rate limiting.** Running this suite's full browser matrix (chromium + firefox + webkit) back-to-back, repeatedly, in a short window can trip opencart.com's own Cloudflare rate limiter (HTTP 1015, a temporary IP-level ban) — a real characteristic of testing a live production site, not a bug in the suite. Prefer a single project locally, and avoid re-running the full matrix in a tight loop.
- **Register's submit button is CAPTCHA-gated.** It stays `disabled` even once every required field has a value, until an image challenge is solved — this suite fills the form but deliberately never submits it, since it can't solve the challenge and this is opencart.com's real production account system.

## Setup

```bash
npm install
npm run install:browsers   # installs Chromium/Firefox/WebKit + OS deps
cp .env.example .env       # fill in real values for your app
```

## Running tests

```bash
npm test                   # headless, all 3 browser projects, parallel
npm run test:headed        # headed (visible browser)
npm run test:ui            # Playwright's interactive UI mode — best for authoring
npm run test:debug         # Playwright Inspector, step-through debugging
npm run test:chromium      # single project only
npx playwright test tests/example/login.spec.ts   # single file
npx playwright test -g "signs in with valid"       # single test by title
```

View the last HTML report:

```bash
npm run report
```

## Writing a new test

1. Add/extend a Page Object under `pages/` — see [Page Objects](#page-objects) below.
2. If the Page Object should be available as a fixture, wire it into `fixtures/base.fixture.ts`.
3. Add a spec under `tests/`, importing `test`/`expect` from `fixtures/base.fixture.ts` (not directly from `@playwright/test`), so it gets the project's fixtures:

```ts
import { test, expect } from '../../fixtures/base.fixture';

test.describe('Feature name', () => {
  test('does the thing', async ({ loginPage }) => {
    await loginPage.goto();
    // ... actions via the Page Object ...
    await expect(loginPage.heading).toBeVisible(); // assertions live in the test
  });
});
```

Rules of thumb:
- **One test, one behavior.** Keep tests independent — no test should depend on another having run first (`fullyParallel: true` is on by default and will happily interleave them).
- Prefer `getByRole` / `getByLabel` / `getByText` locators; fall back to `getByTestId`; use raw CSS only as a last resort with a comment explaining why (see `flash-message.component.ts` for an example).
- Use web-first assertions (`await expect(locator).toBeVisible()`) — never `page.waitForTimeout(...)`. Playwright auto-waits; a manual sleep is almost always masking a missing wait condition.
- If a test needs to create its own data, make it worker-safe with `utils/worker-scope.ts`'s `uniqueId()` rather than a hardcoded value that could collide across parallel workers.

## Page Objects

- One class per page or reusable component: `<Name>Page` (e.g. `LoginPage`) or `<Name>Component` (e.g. `FlashMessageComponent`).
- The constructor takes `Page` and stores every locator as a `readonly` field — locators are built once, not re-queried inside every method.
- Page Objects expose **actions** (`login(user, pass)`) and **getters** (`this.heading`) only. They never contain `expect(...)` — that keeps failure messages pointing at the test's actual intent.
- Extend `BasePage` for page-level navigation helpers (`goto`, `getTitle`, ...).
- Compose (don't inherit) for regions shared *across* pages — e.g. `FlashMessageComponent` is instantiated by both `LoginPage` and `SecureAreaPage` instead of duplicating the locator or forcing an unrelated inheritance chain.
- Wrap a Page Object action's body in `test.step('...', async () => { ... })` (import `test` directly from `@playwright/test` inside the Page Object file — see `pages/opencart/marketplace.page.ts`'s `search()`). `reporters/custom-reporter.ts` prints each `test.step()` live in the terminal/VS Code console as it runs, so a failure's last-printed step is exactly what was in flight — no need to open the HTML report or a trace just to see where a test broke.

## Fixtures

`fixtures/base.fixture.ts` extends Playwright's `test` with one fixture per Page Object (`loginPage`, `secureAreaPage`, ...), created fresh per test. Import `test`/`expect` from this file in every spec instead of `@playwright/test` directly.

### Authenticated page fixture

The `authenticatedPage` fixture provides a page with an active login session already in place. Instead of navigating to a login form and filling it out (slow, flaky), it logs in via API before the test runs, setting valid session cookies on the page:

```ts
import { test, expect } from '../fixtures/base.fixture';

test('access protected page while logged in', async ({ authenticatedPage }) => {
  // Page already has session cookies from API login
  await authenticatedPage.goto('/secure');
  await expect(authenticatedPage.locator('h1')).toContainText('Secure Area');
});
```

**How it works:**
- `ApiAuth` (in `utils/api-auth.ts`) sends a POST request to `/login` with `TEST_USER_USERNAME` and `TEST_USER_PASSWORD` from `.env`.
- The response's `Set-Cookie` header is parsed to extract session cookies.
- Cookies are added to the page context before the test runs.
- Your test inherits the fully authenticated page, ready to access protected routes.

**Benefits over UI-based login:**
- **Fast:** No waiting for page loads, form fills, or button clicks.
- **Reliable:** API calls don't flake on UI timing issues or Cloudflare challenges (unlike navigating to a login form).
- **Readable:** The test's body focuses on what you're actually testing, not login mechanics.

This project intentionally does **not** ship data factories/builders or network mocking — designing those is a `test-data-engineer` concern. If your suite needs them, that's the place to add it.

## Parallel execution

- `fullyParallel: true` in `playwright.config.ts` — tests run in parallel by default, across all projects/workers.
- Tests must not share mutable state. If a spec genuinely needs to run serially (e.g. it depends on side effects from a previous test), that's a smell — isolate the shared state instead. Only reach for `test.describe.configure({ mode: 'serial' })` as a deliberate, documented exception.
- Use `uniqueId()` from `utils/worker-scope.ts` (keyed off `testInfo.parallelIndex`) whenever a test creates its own data, so concurrent workers never collide.

## Retries

- `retries` is set to `2` on CI only (`retries: env.isCI ? 2 : 0`), never locally. A test that only passes on retry is a bug in the test (or the app), not something to paper over — investigate it rather than raising the retry count.
- Never add `page.waitForTimeout(...)` to chase flakiness. Use `expect(locator).toBeVisible()` / `toHaveText()` / etc., which auto-retry against the live DOM state.

## Continuous Integration

`.github/workflows/playwright.yml` runs on push/PR to `main`, nightly (`01:00 UTC`), and on demand (`workflow_dispatch`, with inputs to pick a project or a specific spec).

- **Two jobs, gated:** `quality-gates` (typecheck + a leftover `test.only()`/`describe.only()` check) must pass before the slower, live-site `e2e` job installs a browser and runs anything against opencart.com.
- **`concurrency`** cancels a stale in-flight run when a new one starts on the same branch — avoids two runs hammering opencart.com at once.
- **`permissions: contents: read`** — least privilege; nothing here needs to write to the repo.
- Actions are pinned by commit SHA (with a version comment), not a mutable tag — see `.github/dependabot.yml`, which opens a PR to bump both when a new release ships.
- Playwright's browser binary is cached (`actions/cache`, keyed on `package-lock.json`) between runs.
- The whole `playwright test` invocation is wrapped in an outer retry (`nick-fields/retry`, 2 attempts) — distinct from Playwright's own per-test `retries` above — specifically to give opencart.com's Cloudflare rate limiting a chance to clear before the next attempt.
- `.github/scripts/check-flaky-passes.js` reads the JSON reporter's per-attempt data to flag (warn, not fail) any test that only passed after a retry — surfacing exactly what the **Retries** section above says to watch for, instead of letting a green checkmark hide it.
- `.github/scripts/write-job-summary.js` posts a pass/fail/skip/flaky count table to the run's Summary page.

## Debugging & the trace viewer

- `trace: 'retain-on-failure'` is configured by default — every failed test on any run has a trace saved to `reports/test-results/.../trace.zip`, without needing to reproduce it.
- On a CI failure, download the trace artifact and open it:

  ```bash
  npx playwright show-trace path/to/trace.zip
  ```

- Locally, `npm run test:debug` opens the Playwright Inspector for step-through debugging, and `npm run test:ui` opens UI mode, which gives you a timeline, DOM snapshots, and a "time travel" view without needing a separate trace file.
- Screenshots and video are also captured `only-on-failure` / `retain-on-failure` (not for every run), so successful CI runs stay lightweight.

## Console output (`reporters/custom-reporter.ts`)

A from-scratch terminal reporter, used instead of the built-in `list`. Replaced `list` (rather than just supplementing it, which is how this started) because two things weren't achievable via `list`'s own reporter options:

- `list` prints the same test identity twice — once on its live per-test line, again in its final numbered failure summary. This reporter prints each test exactly once: one line with the project, full title, and outcome (e.g. `✘ 1 [chromium] Extension detail page › shows a Buy button and price for a commercial extension (8.8s)`).
- `list` always prints the error message (where `Expected`/`Received` live) *before* the source code frame. This reporter prints them in the other order — code location + code frame first, then the message — because `TestError`'s `location`/`snippet`/`message` are separate, stable fields, not a single blob that has to be parsed to reorder.

It also prints each `test.step()` live as it runs (see **Page Objects** above) and a clickable screenshot link on failure (`reporters/terminal-links.ts` — an OSC 8 terminal hyperlink, confirmed live that relying on a terminal to *heuristically* recognize a bare path as a link isn't reliable enough; only emitted when `process.stdout.isTTY`, so a non-interactive log doesn't get raw escape-byte clutter). The `html`/`junit`/`json` reporters are unaffected and still produce their usual artifacts under `reports/`.

## Configuration reference

| Concern | Where | Notes |
|---|---|---|
| Base URL / env vars | `.env` (via `config/env.ts`) | Never read `process.env` directly in tests/pages |
| Timeouts | `playwright.config.ts` (`timeout`, `expect.timeout`, `actionTimeout`, `navigationTimeout`) | Per-test/action overrides via `test.setTimeout()` if a specific test genuinely needs more |
| Browsers | `playwright.config.ts` `projects` | Chromium, Firefox, WebKit configured; add/remove as needed |
| Reports | `playwright.config.ts` `reporter` / `outputDir` | HTML + JUnit, all under `reports/` |
