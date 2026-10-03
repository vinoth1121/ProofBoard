/**
 * Production smoke test.
 *
 * Drives the *built* bundle in a real browser against whichever Chrome/Edge
 * binary is installed locally — no browser download required. This is what
 * proves the deployed app works with no backend: MSW is running from the
 * production bundle, the service worker is live, and deep links survive a
 * hard refresh.
 *
 *   npm run build && npm run preview   # in one terminal
 *   npm run smoke -- http://localhost:4173
 *
 * Pass `--shots <dir>` to also capture the frame sequence used for the README
 * timeline GIF.
 */

import { mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-core';

const CANDIDATE_BROWSERS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

function findBrowser() {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv !== undefined && existsSync(fromEnv)) return fromEnv;
  const found = CANDIDATE_BROWSERS.find((candidate) => existsSync(candidate));
  if (found === undefined) {
    throw new Error('No Chrome/Edge binary found. Set CHROME_PATH to a browser executable.');
  }
  return found;
}

const baseUrl = process.argv[2] ?? 'http://localhost:4173';
const shotsIndex = process.argv.indexOf('--shots');
const shotsDir = shotsIndex !== -1 ? (process.argv[shotsIndex + 1] ?? null) : null;

const checks = [];
function check(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === '' ? '' : ` — ${detail}`}`);
}

const browser = await chromium.launch({ executablePath: findBrowser() });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(String(error)));

try {
  // ---------------------------------------------------------------- index --
  await page.goto(`${baseUrl}/campaigns`, { waitUntil: 'networkidle' });
  const cards = page.locator('main a[href^="/campaigns/c-"]');
  await cards.first().waitFor({ state: 'visible', timeout: 20000 });
  const cardCount = await cards.count();
  check('campaign index renders cards from the mock API', cardCount > 0, `${cardCount} cards`);
  check(
    'blueprint ground is themed',
    (await page.locator('html').getAttribute('data-theme')) === 'dark',
  );

  // ------------------------------------------------------- URL-synced state
  await page.getByRole('button', { name: /^live/i }).click();
  await page.waitForURL(/status=live/, { timeout: 10000 });
  check('status filter is written to the query string', page.url().includes('status=live'));

  // A shared URL must survive a cold load.
  const sharedUrl = `${baseUrl}/campaigns?status=ended&sort=name&dir=asc&page=2`;
  await page.goto(sharedUrl, { waitUntil: 'networkidle' });
  await cards.first().waitFor({ state: 'visible', timeout: 20000 });
  check('shared filter URL restores the exact view', page.url().includes('page=2'));

  // ------------------------------------------------------------ deep link --
  const deepLink = `${baseUrl}/campaigns/c-007`;
  await page.goto(deepLink, { waitUntil: 'networkidle' });
  const stripTitle = page.getByText('Proof-of-play timeline');
  await stripTitle.waitFor({ state: 'visible', timeout: 20000 });
  const frameCount = await page.locator('ol[aria-label^="Play frames"] > li').count();
  check('deep link renders the film strip', frameCount > 0, `${frameCount} frames`);

  // Hard refresh of a deep link (the SPA-rewrite test).
  await page.reload({ waitUntil: 'networkidle' });
  await stripTitle.waitFor({ state: 'visible', timeout: 20000 });
  check('deep link survives a hard refresh', page.url().endsWith('/campaigns/c-007'));

  // -------------------------------------------------------------- modal ---
  const firstFrame = page.locator('ol[aria-label^="Play frames"] > li > button').first();
  await firstFrame.click();
  const dialog = page.locator('[role="dialog"]');
  await dialog.waitFor({ state: 'visible', timeout: 10000 });
  check('proof modal opens', await dialog.isVisible());

  const frameLabel = () =>
    dialog
      .locator('span', { hasText: /^Frame \d+ of \d+$/ })
      .first()
      .innerText();
  const before = await frameLabel();
  await page.keyboard.press('ArrowRight');
  const after = await frameLabel();
  check('arrow keys step between frames', before !== after, `${before} -> ${after}`);
  check(
    'focus stays trapped in the dialog',
    await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return d !== null && d.contains(document.activeElement);
    }),
  );
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden', timeout: 10000 });
  check('Escape closes the modal', (await dialog.count()) === 0);

  // ---------------------------------------------------- optimistic update --
  const flagButton = page.getByRole('button', { name: /^Flag play on screen/ }).first();
  const flagRow = page.locator('tbody tr').first();
  // Scope to the status cell: the proof thumbnail also carries data-status.
  const rowStatus = () =>
    flagRow.locator('td:nth-child(6) [data-status]').getAttribute('data-status');
  const rowBefore = await rowStatus();
  await flagButton.click();
  const optimistic = await rowStatus();
  check(
    'flagging paints optimistically',
    optimistic === 'flagged',
    `${rowBefore} -> ${optimistic}`,
  );
  // The write fails ~10% of the time; either outcome is a pass.
  await page.waitForTimeout(2500);
  const settled = await rowStatus();
  check(
    'flag write settles (committed or rolled back)',
    settled === 'flagged' || settled === rowBefore,
    `settled: ${settled}`,
  );

  // ---------------------------------------------------------- empty state --
  await page.goto(`${baseUrl}/campaigns?query=zzzz-no-such-campaign`, { waitUntil: 'networkidle' });
  await page
    .getByText('No campaigns match this filter')
    .waitFor({ state: 'visible', timeout: 20000 });
  check('empty state renders', true);

  // ------------------------------------------------------------------ 404 --
  await page.goto(`${baseUrl}/totally/unknown`, { waitUntil: 'networkidle' });
  await page
    .getByText('This sheet is not in the drawing set')
    .waitFor({ state: 'visible', timeout: 20000 });
  check('404 route renders a drawn sheet, not a blank page', true);

  // ---------------------------------------------------------------- theme --
  await page.goto(`${baseUrl}/campaigns`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /switch to paper blueprint theme/i }).click();
  const lightTheme = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('button', { name: /switch to deep navy theme/i }).waitFor({ timeout: 5000 });
  check('light "paper blueprint" theme toggles', lightTheme === 'light');

  // ------------------------------------------------- README capture (GIF) --
  if (shotsDir !== null) {
    await rm(shotsDir, { recursive: true, force: true });
    await mkdir(shotsDir, { recursive: true });

    // Capture in the primary (deep navy) palette regardless of the theme
    // toggle test that ran a moment ago.
    await page.evaluate(() => localStorage.setItem('proofboard.theme', 'dark'));

    await page.goto(`${baseUrl}/campaigns/c-007`, { waitUntil: 'networkidle' });
    await stripTitle.waitFor({ state: 'visible', timeout: 20000 });
    const trackWidth = await page.evaluate(() => {
      const el = document.querySelector('ol[aria-label^="Play frames"]');
      return el === null ? 0 : el.scrollWidth;
    });

    // Pan across the timeline, one viewport per shot, to read as a film reel.
    const steps = 14;
    for (let i = 0; i < steps; i += 1) {
      const max = Math.max(0, trackWidth - 1200);
      await page.evaluate(
        ([x, w]) => {
          const scroller = document.querySelector('[class*="strip"]');
          if (scroller !== null && w > 0) scroller.scrollLeft = x;
        },
        [(max / (steps - 1)) * i, 1200],
      );
      await page.waitForTimeout(220);
      await page.screenshot({
        path: path.join(shotsDir, `timeline-${String(i).padStart(2, '0')}.png`),
        clip: { x: 0, y: 250, width: 1440, height: 330 },
      });
    }

    // Wide stills: detail view and index, plus the light "paper blueprint".
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(shotsDir, 'hero.png') });

    await page.goto(`${baseUrl}/campaigns?status=live`, { waitUntil: 'networkidle' });
    await page.locator('main a[href^="/campaigns/c-"]').first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(shotsDir, 'index.png') });

    await page.evaluate(() => localStorage.setItem('proofboard.theme', 'light'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(shotsDir, 'paper.png') });

    const shots = (await readdir(shotsDir)).filter((name) => name.startsWith('timeline-'));
    check(`captured ${shots.length} timeline frames for the README GIF`, shots.length === steps);
  }

  // ------------------------------------------------------------- console ---
  // Two console messages are expected and deliberately tolerated:
  //  - the 409 from the flag endpoint, which fails ~10% of the time on
  //    purpose (it is what makes the optimistic rollback observable);
  //  - the benign "failed to update a ServiceWorker" notice emitted when the
  //    mock worker re-registers on a later navigation in the same context.
  const EXPECTED_CONSOLE = [/status of 409/, /Failed to update a ServiceWorker/, /favicon/];
  const noisy = consoleErrors.filter(
    (text) => !EXPECTED_CONSOLE.some((pattern) => pattern.test(text)),
  );
  check('no unexpected console errors', noisy.length === 0, noisy.slice(0, 3).join(' | '));
} finally {
  await browser.close();
}

const failed = checks.filter((entry) => !entry.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length > 0) {
  console.error('Failed checks:', failed.map((entry) => entry.name).join(', '));
  process.exit(1);
}
