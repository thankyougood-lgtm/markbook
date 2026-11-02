import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4180';
const VIEWPORTS = [
  { name: '360x780', width: 360, height: 780 },
  { name: '390x844', width: 390, height: 844 }
];

const browser = await chromium.launch();
let failed = false;

async function seedStudent(page) {
  await page.goto(`${BASE}/#/add-record`);
  await page.waitForTimeout(600);
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
      await inputs.nth(0).fill('11A');
      for (let i = 1; i < count; i += 1) await inputs.nth(i).fill(`v${i}`);
      await page.getByRole('button', { name: 'Save' }).click();
      await page.waitForTimeout(900);
    }
  }

  // A new class gets a blank Sheet1; the student list has to be a roster sheet,
  // which the first one created becomes automatically.
  const addSheet = page.getByRole('button', { name: 'Add sheet' });
  if (await addSheet.count()) {
    await addSheet.click();
    await page.waitForTimeout(300);
    const roster = page.getByRole('button', { name: 'Class roster template' });
    if (await roster.count()) {
      await roster.click();
      await page.waitForTimeout(900);
    }
  }

  const cells = page.locator('.jss_worksheet tbody tr td');
  // Tab moves right within the row; Enter would move down and scatter values.
  const fill = async (index, text) => {
    const cell = cells.nth(index);
    await cell.click();
    await page.keyboard.type(text);
    await page.keyboard.press('Tab');
  };
  // The sheet is 26 columns wide, so row 2 starts at index 26.
  await fill(26, '1');
  await fill(27, 'Abebe');
  await fill(28, 'M');
  await fill(29, '16');
  await page.waitForTimeout(900);
}

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(`${String(e)}\n${e.stack ?? ''}`));

  await seedStudent(page);
  const seeded = await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    return { dbs: dbs.map((d) => d.name), addRecordCells: document.querySelectorAll('.jss_worksheet tbody tr td').length };
  });
  console.log(`${vp.name}: seeded=${JSON.stringify(seeded)}`);
  await page.goto(`${BASE}/#/attendance`);
  const found = await page
    .waitForSelector('.jss_worksheet', { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  await page.waitForTimeout(600);

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const nav = document.querySelector('nav[aria-label="Primary"]');
    const grid = document.querySelector('.jss_worksheet');
    const rows = document.querySelectorAll('.jss_worksheet tbody tr').length;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      navTop: nav ? nav.getBoundingClientRect().top : null,
      gridBottom: grid ? grid.getBoundingClientRect().bottom : null,
      rows
    };
  });

  const overflow = Math.max(metrics.scrollWidth, metrics.bodyScrollWidth) - metrics.clientWidth;
  const overlap =
    metrics.navTop !== null && metrics.gridBottom !== null ? metrics.gridBottom - metrics.navTop : null;
  const ok = found && overflow <= 0 && (overlap === null || overlap <= 1) && consoleErrors.length === 0 && metrics.rows >= 2;
  if (!ok) failed = true;

  console.log(
    `${vp.name}: grid=${found}, rows=${metrics.rows}, overflowX=${overflow}px, gridBelowNav=${overlap}px, consoleErrors=${consoleErrors.length}${ok ? '' : ' <-- FAIL'}`
  );
  if (consoleErrors.length) console.log('  errors:', consoleErrors.slice(0, 3));
  if (!ok) {
    console.log('  page text:', (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300));
    await page.screenshot({ path: `docs/screenshots/attendance-${vp.name}-debug.png` });
  }
  await context.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
