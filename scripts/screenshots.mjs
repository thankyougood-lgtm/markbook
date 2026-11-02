import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const OUT = 'docs/screenshots';

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2
});
const page = await context.newPage();
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e)));

async function createClass(name) {
  await page.goto(`${BASE}/#/add-record`);
  const opener = page.getByRole('button', { name: 'New class' }).first();
  if (await opener.count()) {
    await opener.click();
    await page.waitForTimeout(300);
    const inSheet = page.getByRole('button', { name: 'New class' });
    if (await inSheet.count()) {
      await inSheet.last().click();
      await page.waitForTimeout(300);
    }
    const inputs = page.locator('form input');
    const count = await inputs.count();
    if (count > 0) {
      await inputs.nth(0).fill(name);
      for (let i = 1; i < count; i += 1) await inputs.nth(i).fill(`v${i}`);
      await page.getByRole('button', { name: 'Save' }).click();
      await page.waitForTimeout(900);
    }
  }
  await page.waitForSelector('.jss_worksheet', { timeout: 15000 }).catch(() => {});
}

// 1. Empty sheet.
await page.goto(`${BASE}/#/add-record`);
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/add-record-390x844-empty.png` });

// 2. With data.
await createClass('11A');
const cells = page.locator('.jss_worksheet tbody tr td');
const fill = async (index, text) => {
  const cell = cells.nth(index);
  await cell.click();
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
};
// Row 1 is used as a header row for this shot.
await fill(0, 'NO');
await fill(1, 'Students name');
await fill(2, 'Sex');
await fill(3, 'Age');
await fill(4, '1');
await fill(5, 'Abebe');
await fill(6, 'M');
await fill(7, '16');
await fill(8, '2');
await fill(9, 'Sara');
await fill(10, 'F');
await fill(11, '15');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/add-record-390x844-data.png` });

// 3. While editing a cell.
await cells.nth(9).dblclick();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/add-record-390x844-editing.png` });

await browser.close();
console.log(`screenshots written to ${OUT}`);
if (errors.length) {
  console.log('console errors:', errors.slice(0, 5));
  process.exit(1);
}
