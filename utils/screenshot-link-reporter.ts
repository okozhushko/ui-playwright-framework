import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

/**
 * Turns an absolute filesystem path into a `file://` URI, percent-encoding
 * each path segment (handles spaces, unicode, etc. in test titles that flow
 * into `reports/test-results/<slug>/` folder names).
 */
function toFileUri(absolutePath: string): string {
  const posixPath = absolutePath.replace(/\\/g, '/');
  const encoded = posixPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `file://${encoded}`;
}

/**
 * Wraps `text` in an OSC 8 terminal hyperlink escape sequence pointing at
 * `uri`. This is what actually makes the printed path clickable — see this
 * file's own header comment for why relying on a terminal's *heuristic*
 * "this looks like a path" detection (what the first version of this
 * reporter did) isn't reliable enough on its own.
 *
 * Written as explicit `\x1B`/`\x07` escapes (not literal control bytes)
 * deliberately, so this stays legible and diff-safe in any editor — raw
 * control characters pasted directly into source are invisible and easy to
 * mangle on copy/paste or a bad file-encoding round-trip.
 */
function hyperlink(uri: string, text: string): string {
  const OSC8 = '\x1B]8;;'; // ESC ] 8 ; ;
  const ST = '\x07'; // BEL, terminates the OSC 8 sequence
  return `${OSC8}${uri}${ST}${text}${OSC8}${ST}`;
}

/**
 * Prints a clickable link to a failed test's screenshot right when it
 * fails, so you don't have to dig through `reports/test-results/` by hand.
 *
 * First version of this reporter just printed the attachment's absolute
 * path as plain text, relying on VS Code's terminal to *heuristically*
 * recognize it as a file link (the same way it recognizes any path-looking
 * string). Confirmed live that this doesn't reliably work — heuristic path
 * detection depends on terminal width/wrapping, VS Code settings, and
 * whether you're even in VS Code's integrated terminal at all. An OSC 8
 * hyperlink (the `hyperlink()` helper above) is the actual terminal
 * protocol for "this text is a link to this URI" — xterm.js (which VS
 * Code's, and iTerm2's, terminal is built on) supports it explicitly,
 * without needing to guess. Still requires Cmd/Ctrl+click to follow, same
 * as any terminal link — that part is a VS Code/terminal convention, not
 * something this reporter controls.
 *
 * A genuine terminal (VS Code, iTerm2, most modern terminal emulators)
 * parses and discards an OSC 8 sequence it doesn't render specially,
 * leaving just the link text — but a *non-interactive* stdout (piped to a
 * file, a CI log viewer with no ANSI parsing) has no terminal emulator to
 * do that discarding, and would show the raw escape bytes/URI as visible
 * clutter. `process.stdout.isTTY` is only `true` for a real, interactive
 * terminal, so the hyperlink is only emitted there; anywhere else this
 * falls back to the plain path.
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
    const link = process.stdout.isTTY
      ? hyperlink(toFileUri(screenshot.path), screenshot.path)
      : screenshot.path;

    console.log(`\n📸 Screenshot — ${title}\n   ${link}`);
  }
}
