/**
 * Turns an absolute filesystem path into a `file://` URI, percent-encoding
 * each path segment (handles spaces, unicode, etc. in test titles that flow
 * into `reports/test-results/<slug>/` folder names).
 */
export function toFileUri(absolutePath: string): string {
  const posixPath = absolutePath.replace(/\\/g, '/');
  const encoded = posixPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `file://${encoded}`;
}

/**
 * Wraps `text` in an OSC 8 terminal hyperlink escape sequence pointing at
 * `uri` — the actual terminal protocol for "this text is a link to this
 * URI" (xterm.js, which VS Code's and iTerm2's terminals are built on,
 * supports it explicitly). Confirmed live that relying on a terminal to
 * *heuristically* guess a bare path is a clickable file link is not
 * reliable enough on its own — this makes it an explicit, unambiguous link
 * instead of a guess.
 *
 * Written as explicit `\x1B`/`\x07` escapes (not literal control bytes)
 * deliberately, so this stays legible and diff-safe in any editor — raw
 * control characters pasted directly into source are invisible and easy to
 * mangle on copy/paste or a bad file-encoding round-trip.
 */
export function hyperlink(uri: string, text: string): string {
  const OSC8 = '\x1B]8;;'; // ESC ] 8 ; ;
  const ST = '\x07'; // BEL, terminates the OSC 8 sequence
  return `${OSC8}${uri}${ST}${text}${OSC8}${ST}`;
}

/**
 * `hyperlink()`, but only when stdout is a real, interactive terminal.
 * A genuine terminal (VS Code, iTerm2, most modern emulators) parses and
 * discards an OSC 8 sequence it doesn't render specially, leaving just the
 * link text — but a *non-interactive* stdout (piped to a file, a CI log
 * viewer with no ANSI parsing) has no terminal emulator to do that
 * discarding, and would show the raw escape bytes/URI as visible clutter.
 */
export function terminalLink(absolutePath: string): string {
  return process.stdout.isTTY
    ? hyperlink(toFileUri(absolutePath), absolutePath)
    : absolutePath;
}
