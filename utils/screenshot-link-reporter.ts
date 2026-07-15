import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

/**
 * Prints a directly clickable, absolute path to a failed test's screenshot
 * right when it fails — on its own line, so VS Code's integrated terminal
 * (which detects filesystem paths in terminal output and turns them into
 * Cmd/Ctrl-clickable links) can jump straight to the image, no need to open
 * the HTML report first.
 *
 * A supplement to the built-in `list` reporter, not a replacement: `list`
 * already prints every attachment (screenshot, video, trace) at a path
 * relative to the process's cwd, which VS Code *can* usually resolve too,
 * but this reporter uses the attachment's absolute filesystem path instead
 * (confirmed live that `TestResult.attachments[].path` is already absolute
 * internally — the built-in reporters just relativize it for cleaner
 * display), which VS Code's link detector matches unambiguously regardless
 * of the terminal's cwd.
 *
 * Printed with a leading blank line: `list`'s own in-progress line for the
 * same test doesn't end in a newline until it redraws, so without one this
 * reporter's output would otherwise run onto the same line — confirmed
 * live.
 */
export default class ScreenshotLinkReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === 'passed') {
      return;
    }

    const screenshot = result.attachments.find(
      (attachment) => attachment.name === 'screenshot' && attachment.path
    );

    if (!screenshot?.path) {
      return;
    }

    // Describe blocks + test title, e.g. "Marketplace search and filters ›
    // searching for a known term returns matching extensions" — the same
    // hierarchy `list`'s own failure summary uses, without the redundant
    // project name/spec file path (the screenshot's own folder name already
    // encodes those).
    const title = test.titlePath().slice(3).join(' › ');

    console.log(`\n📸 Screenshot — ${title}\n   ${screenshot.path}`);
  }
}
