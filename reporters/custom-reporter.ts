import path from 'node:path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestError,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';
import { terminalLink } from './terminal-links';

/**
 * A from-scratch terminal reporter, replacing the built-in `list` reporter
 * (see `playwright.config.ts`).
 *
 * Why not `list`: it works well, but its live per-test line and its final
 * numbered failure summary both print the same "[project] › file › ... ›
 * title" identity for the same test, and its failure block always prints
 * the error message (Expected/Received) *before* the source code frame —
 * neither of those is configurable via `list`'s reporter options, since
 * that formatting is internal to Playwright, not an exposed extension
 * point. Confirmed live, both while building this project's screenshot-link
 * reporter and by inspecting the `list` reporter's own behavior directly.
 *
 * This reporter prints each test exactly once — one line with the project,
 * full title, and outcome — and, on failure, the code location + code
 * frame *before* the error message (which is where Expected/Received
 * actually live), plus a clickable screenshot link. `TestError`'s
 * `location`/`snippet`/`message` are separate, stable fields (not a single
 * blob to parse), which is what makes reordering them straightforward and
 * not fragile.
 */

const STATUS_ICON: Record<TestResult['status'], string> = {
  passed: '✓',
  failed: '✘',
  timedOut: '✘',
  interrupted: '✘',
  skipped: '-',
};

function relative(file: string): string {
  return path.relative(process.cwd(), file);
}

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Prefixes every line of `text` with `prefix`, for visual grouping under a test's main line. */
function indent(text: string, prefix = '    '): string {
  return text
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
}

export default class CustomReporter implements Reporter {
  private rootSuite: Suite | undefined;
  private testCount = 0;

  onBegin(_config: FullConfig, suite: Suite): void {
    this.rootSuite = suite;
  }

  // Only `test.step()` calls (this project's Page Object actions — see
  // e.g. `pages/opencart/marketplace.page.ts`'s `search()`) are printed
  // live, not every internal Playwright API/fixture/hook step — those
  // would be far too noisy to be useful here.
  onStepEnd(_test: TestCase, _result: TestResult, step: TestStep): void {
    if (step.category !== 'test.step') {
      return;
    }
    console.log(`    › ${step.title} (${formatDuration(step.duration)})`);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.testCount += 1;

    // titlePath() is [root, project, file, ...describe blocks, test title].
    // The project name is worth keeping (which browser ran this); the file
    // path is dropped as redundant once we already print `error.location`
    // below on a failure.
    const project = test.titlePath()[1] ?? '';
    const title = test.titlePath().slice(3).join(' › ');
    const icon = STATUS_ICON[result.status] ?? '?';
    const retrySuffix = result.retry > 0 ? ` (retry #${result.retry})` : '';
    const durationSuffix = result.status === 'skipped' ? '' : ` (${formatDuration(result.duration)})`;

    console.log(`\n${icon} ${this.testCount} [${project}] ${title}${retrySuffix}${durationSuffix}`);

    for (const error of result.errors) {
      this.printError(error);
    }

    const screenshot = result.attachments.find(
      (attachment) => attachment.name === 'screenshot' && attachment.path
    );
    if (screenshot?.path) {
      console.log(`\n  📸 Screenshot: ${terminalLink(screenshot.path)}`);
    }
  }

  private printError(error: TestError): void {
    // Code location + code frame FIRST — "where in my test did this
    // happen" — then the error message (which is where Playwright's
    // matchers put Expected/Received/Locator/Call log) second. This order
    // is the entire point of this reporter; see the class doc comment.
    if (error.location) {
      console.log(
        `\n  at ${relative(error.location.file)}:${error.location.line}:${error.location.column}`
      );
    }

    if (error.snippet) {
      console.log(`\n${indent(error.snippet)}`);
    }

    if (error.message) {
      console.log(`\n${indent(error.message.trimEnd())}`);
    }
  }

  onEnd(result: FullResult): void {
    const tests = this.rootSuite?.allTests() ?? [];

    // `npx playwright test --list` never calls `onTestEnd` (no test
    // actually runs — confirmed by reading Playwright's own runner: list
    // mode only runs a "load" + "report begin" task, skipping the "run
    // tests" task entirely) but still calls `onEnd`. Built-in reporters
    // named exactly `list`/`dot`/`line` get silently swapped for an
    // internal list-mode reporter in that case; a custom reporter (loaded
    // by file path, like this one) does not, and there's no public,
    // documented way to ask "is this a --list run?" directly. Detecting it
    // indirectly — tests exist, but none of them ever reached
    // `onTestEnd` — is what lets this reporter still print a sensible
    // enumeration instead of a nonsensical "0 passed, 0 failed, N skipped".
    if (this.testCount === 0 && tests.length > 0) {
      this.printList(tests);
      return;
    }

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let flaky = 0;

    for (const test of tests) {
      switch (test.outcome()) {
        case 'skipped':
          skipped += 1;
          break;
        case 'flaky':
          flaky += 1;
          break;
        case 'unexpected':
          failed += 1;
          break;
        default:
          passed += 1;
      }
    }

    console.log(
      `\n${passed} passed, ${failed} failed, ${skipped} skipped, ${flaky} flaky (${formatDuration(result.duration)})`
    );
  }

  private printList(tests: TestCase[]): void {
    for (const test of tests) {
      const project = test.titlePath()[1] ?? '';
      const title = test.titlePath().slice(3).join(' › ');
      console.log(
        `  [${project}] › ${relative(test.location.file)}:${test.location.line}:${test.location.column} › ${title}`
      );
    }

    const fileCount = new Set(tests.map((test) => test.location.file)).size;
    console.log(`\nTotal: ${tests.length} test${tests.length === 1 ? '' : 's'} in ${fileCount} file${fileCount === 1 ? '' : 's'}`);
  }

  printsToStdio(): boolean {
    return true;
  }
}
