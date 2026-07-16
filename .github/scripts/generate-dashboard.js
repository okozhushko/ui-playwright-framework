#!/usr/bin/env node
/**
 * Renders a single self-contained HTML dashboard from the accumulated test
 * -history file (see append-test-history.js).
 *
 * Deliberately no charting library, CDN script, or client-side fetch:
 * - No CDN (Chart.js etc.) because this file needs to render when opened
 *   straight off disk (`file://`) or from GitHub Pages with no guaranteed
 *   network access to a third-party CDN.
 * - No `fetch('./history.json')` at runtime either — browsers block
 *   cross-origin-style XHR/fetch from a `file://` page fetching another
 *   local file (Chrome/Edge, in particular), so that would silently break
 *   the "open the HTML file locally" use case this is meant to support.
 * - Instead, every chart is plain SVG computed here, at generation time,
 *   and baked directly into the HTML markup. Opening the file needs zero
 *   JavaScript execution — it's a static document, which is also exactly
 *   what makes it safe to show a non-technical client without caveats.
 *
 * Regenerated on every run that appends history (see
 * publish-test-history.sh) — never hand-edited.
 */
const fs = require('node:fs');
const path = require('node:path');

const historyPath = process.argv[2] ?? 'reports/history.json';
const outputPath = process.argv[3] ?? 'reports/dashboard.html';

// Only the most recent runs are actually legible as individual bars/points
// in a chart this size — older ones are still in history.json for anyone
// who wants to dig in, just not rendered.
const MAX_CHART_POINTS = 50;
const RECENT_TABLE_ROWS = 15;

function readHistory() {
  if (!fs.existsSync(historyPath)) {
    return [];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

/** Stacked bar chart: passed/flaky/failed/skipped counts per run. */
function renderStackedBarChart(runs) {
  const width = 900;
  const height = 260;
  const marginLeft = 40;
  const marginBottom = 30;
  const marginTop = 10;
  const plotWidth = width - marginLeft - 10;
  const plotHeight = height - marginTop - marginBottom;

  const maxTotal = Math.max(1, ...runs.map((r) => r.total ?? 0));
  const barGap = 2;
  const barWidth = Math.max(2, plotWidth / runs.length - barGap);

  const colors = { passed: '#2e7d32', flaky: '#f9a825', failed: '#c62828', skipped: '#9e9e9e' };
  const segments = ['passed', 'flaky', 'failed', 'skipped'];

  let bars = '';
  runs.forEach((run, i) => {
    const x = marginLeft + i * (barWidth + barGap);
    let yCursor = marginTop + plotHeight;
    for (const key of segments) {
      const value = run[key] ?? 0;
      if (value === 0) continue;
      const segHeight = (value / maxTotal) * plotHeight;
      yCursor -= segHeight;
      bars += `<rect x="${x.toFixed(1)}" y="${yCursor.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${segHeight.toFixed(1)}" fill="${colors[key]}"><title>${escapeHtml(formatDate(run.timestamp))} — ${key}: ${value}</title></rect>`;
    }
  });

  // Y-axis gridlines/labels at 0/25/50/75/100% of the tallest run.
  let gridlines = '';
  for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
    const y = marginTop + plotHeight - fraction * plotHeight;
    const label = Math.round(fraction * maxTotal);
    gridlines += `<line x1="${marginLeft}" y1="${y.toFixed(1)}" x2="${width - 10}" y2="${y.toFixed(1)}" stroke="#e0e0e0" stroke-width="1" />`;
    gridlines += `<text x="${marginLeft - 6}" y="${(y + 3).toFixed(1)}" font-size="10" text-anchor="end" fill="#666">${label}</text>`;
  }

  const firstLabel = runs.length ? escapeHtml(formatDate(runs[0].timestamp)) : '';
  const lastLabel = runs.length ? escapeHtml(formatDate(runs[runs.length - 1].timestamp)) : '';

  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Passed, flaky, failed and skipped counts per run">
    ${gridlines}
    ${bars}
    <text x="${marginLeft}" y="${height - 6}" font-size="10" fill="#666">${firstLabel}</text>
    <text x="${width - 10}" y="${height - 6}" font-size="10" text-anchor="end" fill="#666">${lastLabel}</text>
  </svg>`;
}

/** Line chart: total test count per run, to show suite-size growth. */
function renderTotalGrowthLine(runs) {
  const width = 900;
  const height = 160;
  const marginLeft = 40;
  const marginBottom = 24;
  const marginTop = 10;
  const plotWidth = width - marginLeft - 10;
  const plotHeight = height - marginTop - marginBottom;

  const totals = runs.map((r) => r.total ?? 0);
  const maxTotal = Math.max(1, ...totals);
  const minTotal = Math.min(...totals, maxTotal);
  const range = Math.max(1, maxTotal - minTotal);

  const points = runs.map((run, i) => {
    const x = runs.length > 1 ? marginLeft + (i / (runs.length - 1)) * plotWidth : marginLeft + plotWidth / 2;
    const y = marginTop + plotHeight - ((run.total - minTotal) / range) * plotHeight;
    return { x, y, total: run.total, timestamp: run.timestamp };
  });

  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const dots = points
    .map(
      (p) =>
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#1565c0"><title>${escapeHtml(formatDate(p.timestamp))} — ${p.total} tests</title></circle>`,
    )
    .join('');

  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Total test count over time">
    <line x1="${marginLeft}" y1="${marginTop}" x2="${marginLeft}" y2="${marginTop + plotHeight}" stroke="#e0e0e0" />
    <line x1="${marginLeft}" y1="${marginTop + plotHeight}" x2="${width - 10}" y2="${marginTop + plotHeight}" stroke="#e0e0e0" />
    <text x="${marginLeft - 6}" y="${marginTop + 4}" font-size="10" text-anchor="end" fill="#666">${maxTotal}</text>
    <text x="${marginLeft - 6}" y="${(marginTop + plotHeight + 3).toFixed(1)}" font-size="10" text-anchor="end" fill="#666">${minTotal}</text>
    <polyline points="${polyline}" fill="none" stroke="#1565c0" stroke-width="2" />
    ${dots}
  </svg>`;
}

function renderRecentRunsTable(runs) {
  const recent = runs.slice(-RECENT_TABLE_ROWS).reverse();
  if (recent.length === 0) {
    return '<p class="muted">No runs recorded yet.</p>';
  }
  const rows = recent
    .map((run) => {
      const passRate = run.total ? Math.round(((run.passed ?? 0) / run.total) * 100) : 0;
      return `<tr>
        <td>${escapeHtml(formatDate(run.timestamp))}</td>
        <td>${escapeHtml(run.branch ?? 'unknown')}</td>
        <td>${escapeHtml(run.testEnv ?? 'prod')}</td>
        <td>${run.passed ?? 0}</td>
        <td>${run.failed ?? 0}</td>
        <td>${run.skipped ?? 0}</td>
        <td class="${(run.flaky ?? 0) > 0 ? 'flaky-cell' : ''}">${run.flaky ?? 0}</td>
        <td>${passRate}%</td>
        <td>${((run.durationMs ?? 0) / 1000).toFixed(1)}s</td>
      </tr>`;
    })
    .join('');

  return `<table>
    <thead><tr><th>Run</th><th>Branch</th><th>Env</th><th>Passed</th><th>Failed</th><th>Skipped</th><th>Flaky</th><th>Pass rate</th><th>Duration</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderEmptyState() {
  return `<p class="muted">No test history recorded yet. This dashboard fills in after the first run of
  <code>.github/workflows/playwright.yml</code> pushes to <code>main</code> — see README's "Test history dashboard" section.</p>`;
}

function render(history) {
  const generatedAt = new Date().toISOString();
  const chartRuns = history.slice(-MAX_CHART_POINTS);
  const latest = history[history.length - 1];

  const totalTests = latest?.total ?? 0;
  const passRate = latest?.total ? Math.round(((latest.passed ?? 0) / latest.total) * 100) : 0;
  const flakyCount = latest?.flaky ?? 0;

  const body =
    history.length === 0
      ? renderEmptyState()
      : `
    <section class="cards">
      <div class="card">
        <div class="card-label">Total tests (latest run)</div>
        <div class="card-value">${totalTests}</div>
      </div>
      <div class="card">
        <div class="card-label">Pass rate (latest run)</div>
        <div class="card-value">${passRate}%</div>
      </div>
      <div class="card ${flakyCount > 0 ? 'card-warning' : ''}">
        <div class="card-label">Flaky tests (latest run)</div>
        <div class="card-value">${flakyCount}</div>
      </div>
      <div class="card">
        <div class="card-label">Runs recorded</div>
        <div class="card-value">${history.length}</div>
      </div>
    </section>

    <section>
      <h2>Passed / flaky / failed / skipped per run</h2>
      <p class="muted">Last ${chartRuns.length} run(s), oldest to newest.</p>
      ${renderStackedBarChart(chartRuns)}
      <p class="legend">
        <span class="swatch" style="background:#2e7d32"></span>Passed
        <span class="swatch" style="background:#f9a825"></span>Flaky
        <span class="swatch" style="background:#c62828"></span>Failed
        <span class="swatch" style="background:#9e9e9e"></span>Skipped
      </p>
    </section>

    <section>
      <h2>Total test count over time</h2>
      <p class="muted">Tracks the suite growing (or shrinking) run over run.</p>
      ${renderTotalGrowthLine(chartRuns)}
    </section>

    <section>
      <h2>Recent runs</h2>
      ${renderRecentRunsTable(history)}
    </section>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Playwright test history — ui-playwright-framework</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding: 24px; color: #1a1a1a; background: #fafafa; }
  h1 { margin-bottom: 4px; }
  .subtitle { color: #666; margin-top: 0; margin-bottom: 24px; }
  .cards { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 32px; }
  .card { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px 20px; min-width: 160px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
  .card-warning { border-color: #f9a825; background: #fff8e1; }
  .card-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.04em; }
  .card-value { font-size: 28px; font-weight: 600; margin-top: 4px; }
  section { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
  section h2 { margin-top: 0; font-size: 16px; }
  .muted { color: #666; font-size: 13px; }
  svg { width: 100%; height: auto; display: block; }
  .legend { font-size: 12px; color: #444; }
  .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin: 0 4px 0 12px; vertical-align: middle; }
  .swatch:first-child { margin-left: 0; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #eee; }
  th { color: #666; font-weight: 600; }
  .flaky-cell { color: #b26a00; font-weight: 600; }
  footer { color: #999; font-size: 12px; margin-top: 8px; }
</style>
</head>
<body>
  <h1>Playwright test history</h1>
  <p class="subtitle">ui-playwright-framework — tracked against opencart.com. Regenerated automatically after each run on <code>main</code>.</p>
  ${body}
  <footer>Generated ${generatedAt}. Source: <code>history.json</code> in this branch (<code>test-history</code>) — see the main repo's README for how this is produced.</footer>
</body>
</html>
`;
}

const history = readHistory();
const html = render(history);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html);

console.log(`Wrote dashboard to ${outputPath} (${history.length} history record(s)).`);
