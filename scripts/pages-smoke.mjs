/** Real-browser checks for the remaining pages. Run the dev server first.
 * Uses the npm-packaged Chromium, so no browser CDN is required.
 * Optional: BASE_URL=http://localhost:5173 node scripts/pages-smoke.mjs
 */
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import chromium from '@sparticuz/chromium';
import { chromium as playwright } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = 'docs/screenshots/pages';
await mkdir(OUT, { recursive: true });

// The packaged AL2023 NSS libraries also work on the sandbox's Debian image.
const libDir = resolve(tmpdir(), 'al2023', 'lib');
if (!existsSync(resolve(libDir, 'libnss3.so'))) {
  const helper = pathToFileURL(resolve('node_modules/@sparticuz/chromium/build/lambdafs.js')).href;
  const { inflate } = await import(helper);
  await inflate(resolve('node_modules/@sparticuz/chromium/bin/al2023.tar.br'));
}
process.env.LD_LIBRARY_PATH = `${libDir}:${process.env.LD_LIBRARY_PATH ?? ''}`;
const executablePath = await chromium.executablePath();
const browser = await playwright.launch({ executablePath, args: chromium.args, headless: true });
const errors = [];
const results = [];
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });

async function check(name, fn) {
  await fn();
  results.push(name);
  console.log(`PASS ${name}`);
}
async function go(route) {
  await page.goto(`${BASE}/#/${route}`);
  await page.locator(`[data-testid="${route}-page"]`).waitFor();
}
async function noOverflow() {
  const size = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth }));
  assert.ok(size.page <= size.viewport + 1, JSON.stringify(size));
}
async function canReachBottom(testId, text) {
  const target = page.getByTestId(testId).getByText(text, { exact: false }).last();
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  const nav = await page.locator('nav[aria-label="Primary"]').boundingBox();
  assert.ok(box && nav && box.y + box.height <= nav.y + 1, `content hidden under nav: ${testId}`);
}

try {
  await check('all three pages render without placeholders', async () => {
    await go('attendance');
    await page.getByText('Create a class to start').waitFor();
    await page.getByLabel('Date').waitFor();
    await page.getByLabel('Period').waitFor();
    await noOverflow();
    await page.screenshot({ path: `${OUT}/attendance-empty-390.png` });
    await go('analytics');
    await page.getByText('No class to analyze yet').waitFor();
    assert.equal(await page.getByText('This page is part of a later version.').count(), 0);
    await noOverflow();
    await page.screenshot({ path: `${OUT}/analytics-empty-390.png` });
    await go('settings');
    await page.getByRole('switch', { name: 'Dark mode' }).waitFor();
    await noOverflow();
    await page.screenshot({ path: `${OUT}/settings-390.png`, fullPage: true });
  });

  await check('dark mode and language persist across pages and reload', async () => {
    await page.getByRole('switch', { name: 'Dark mode' }).click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    await page.getByLabel('Language').selectOption('om');
    await page.getByRole('heading', { name: "Qindaa'ina", level: 1 }).waitFor();
    await page.locator('nav[aria-label="Primary"]').getByRole('button', { name: 'Xiinxala' }).click();
    await page.locator('[data-testid="analytics-page"]').waitFor();
    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark' && document.documentElement.lang === 'om');
    await page.screenshot({ path: `${OUT}/analytics-dark-om-390.png` });
    await page.locator('nav[aria-label="Primary"]').getByRole('button', { name: "Qindaa'ina" }).click();
    await page.getByLabel('Afaan').selectOption('en');
    await page.getByRole('switch', { name: 'Dark mode' }).click();
  });

  await check('backup downloads valid JSON and restore requires preview/confirmation', async () => {
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download backup', exact: true }).click();
    const download = await downloadEvent;
    const path = await download.path();
    const { readFile } = await import('node:fs/promises');
    const backup = JSON.parse(await readFile(path, 'utf8'));
    assert.equal(backup.format, 'markbook-backup');
    assert.equal(Object.keys(backup.tables).length, 10);
    await page.getByLabel('Choose backup to restore').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await page.getByTestId('restore-preview').waitFor();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(await page.getByTestId('restore-preview').count(), 0);
    await page.getByLabel('Choose backup to restore').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByTestId('restore-preview').count(), 0);
  });

  await check('seeded roster appears in Attendance and saves/reloads a status', async () => {
    // This runs in an isolated browser context, never in the user's browser DB.
    await page.evaluate(async () => {
      const { createClass } = await import('/src/db/repositories/classes.ts');
      const { addStudent } = await import('/src/db/repositories/students.ts');
      const { addSubject } = await import('/src/db/repositories/subjects.ts');
      const { setScore } = await import('/src/db/repositories/scores.ts');
      const { setSelectedClassId } = await import('/src/state/selection.ts');
      const cls = await createClass({ name: '11A', grade: '11', section: 'A', academicYear: '2018 EC', schoolName: 'Test school', teacherName: 'Test teacher' });
      setSelectedClassId(cls.id);
      const a = await addStudent(cls.id, { fullName: 'Abebe', sex: 'M', age: 16 });
      await addStudent(cls.id, { fullName: 'Sara', sex: 'F', age: 15 });
      const subject = await addSubject(cls.id, 'Maths');
      await setScore(a, 1, subject, 80);
    });
    await page.goto(`${BASE}/#/attendance`);
    await page.reload();
    await page.getByTestId('attendance-table').waitFor();
    await page.getByRole('button', { name: 'Abebe - present', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Saved' }).waitFor();
    await page.reload();
    await page.getByTestId('attendance-table').waitFor();
    await page.waitForFunction(() => document.querySelector('button[aria-label="Abebe - present"]')?.getAttribute('aria-pressed') === 'true');
    await noOverflow();
    await page.screenshot({ path: `${OUT}/attendance-roster-390.png` });
  });

  await check('Analytics renders real Recharts SVGs and the saved student summary', async () => {
    await go('analytics');
    await page.getByTestId('analytics-summary').getByText('Abebe').waitFor();
    await page.locator('[data-testid="subject-chart"] svg.recharts-surface').waitFor();
    await page.locator('[data-testid="status-chart"] svg.recharts-surface').waitFor();
    await page.locator('[data-testid="trend-chart"] svg.recharts-surface').waitFor();
    await noOverflow();
    await page.screenshot({ path: `${OUT}/analytics-data-390.png`, fullPage: true });
    await canReachBottom('analytics-page', 'Conduct, average grade and rank are not calculated.');
  });

  await check('phone, small Android, tablet and desktop widths do not overflow', async () => {
    for (const [width, height] of [[360, 780], [393, 852], [768, 1024], [1280, 800]]) {
      await page.setViewportSize({ width, height });
      for (const route of ['attendance', 'analytics', 'settings']) {
        await go(route);
        await page.waitForTimeout(150);
        await noOverflow();
      }
    }
    await page.screenshot({ path: `${OUT}/settings-desktop-1280.png`, fullPage: true });
    await canReachBottom('settings-page', 'installable PWA version.');
  });
  assert.deepEqual(errors, [], `Browser console errors/warnings:\n${errors.join('\n')}`);
  console.log(`PASS zero browser console errors/warnings`);
} finally {
  await browser.close();
}
console.log(`\n${results.length} browser checks passed. Screenshots: ${OUT}`);
