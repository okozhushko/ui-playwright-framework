'use strict';

const { defineConfig, globalIgnores } = require('eslint/config');
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const playwright = require('eslint-plugin-playwright');

/**
 * Flat config (ESLint 10 — see package.json for the exact pinned version).
 * `defineConfig`'s `extends` merges each named ruleset scoped to the
 * surrounding object's own `files` glob, so a config block below only ever
 * lints the directories it names, not the whole repo.
 */
module.exports = defineConfig([
  globalIgnores([
    // Generated reporter/report artifacts (HTML report, traces, JUnit,
    // screenshots/video) — see playwright.config.ts's `outputDir`/`reporter`
    // config for where these come from. Never hand-authored, so nothing
    // here is worth linting.
    'reports/**',
    // Exploratory MCP browser-session captures (console logs, page
    // snapshots) — see the project's .gitignore for the same exclusion.
    '.playwright-mcp/**',
  ]),

  // Baseline TS correctness across every source directory this project
  // owns. The non-type-checked "recommended" preset is used deliberately —
  // `npm run typecheck` (`tsc --noEmit`) already does full, type-aware
  // checking; layering `recommendedTypeChecked` on top would re-run a
  // slower type-aware pass here just to duplicate what typecheck already
  // gates in CI.
  {
    files: ['pages/**/*.ts', 'tests/**/*.ts', 'fixtures/**/*.ts', 'reporters/**/*.ts', 'utils/**/*.ts', 'config/**/*.ts', 'playwright.config.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },

  // Playwright anti-pattern rules. Scoped to the directories that actually
  // exercise the Playwright Page/Locator/test API surface these rules
  // police (spec files, Page Objects, and the fixture file that wires Page
  // Objects together) — reporters/, utils/, and config/ never touch that
  // API (reporters/ only implements the separate `Reporter` interface), so
  // applying these rules there would just be noise with nothing to catch.
  {
    files: ['tests/**/*.ts', 'pages/**/*.ts', 'fixtures/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      // Elevated from the preset's default "warn" to "error" — this is a
      // real quality gate (`npm run lint` in CI), and a rule that only
      // warns is easy to ignore in review. The 4 known, deliberately
      // skipped tests (documented at length in account.spec.ts/home.spec.ts
      // — a real, unfixable Cloudflare bot-challenge, not neglect) are each
      // given a narrow `eslint-disable-next-line` at their exact call site
      // instead of turning this off repo-wide, so a *new*, undocumented
      // `.skip` anywhere else still fails the gate.
      'playwright/no-skipped-test': 'error',
    },
  },
]);
