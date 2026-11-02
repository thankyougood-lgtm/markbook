import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const VIEWPORTS = [
  { name: '360x780', width: 360, height: 780 },
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 }
];

const browser = await chromium.launch();
let failed = false;

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.width < 700,
    hasTouch: vp.width < 700
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  const response = await page.goto(`${BASE}/#/add-record`);
  if (!response || !response.ok()) {
    console.log(`${vp.name}: preview server not reachable (${response ? response.status() : 'no response'})`);
    failed = true;
    await context.close();
    continue;
  }

  // Create a class through the UI so a sheet exists.
  const newClass = page.getByRole('button', { name: 'New class' }).first();
  if (await newClass.count()) {
    await newClass.click();
    await page.waitForTimeout(300);
    // The class sheet opens on the class list; its own "New class" button opens the form.
    const inSheet = page.getByRole('button', { name: 'New class' });
    if (await inSheet.count()) {
      await inSheet.last().click();
      await page.waitForTimeout(300);
    }
    const inputs = page.locator('form input');
    const count = await inputs.count();
    for (let i = 0; i < count; i += 1) {
      await inputs.nth(i).fill(`v${i}`);
    }
    if (count > 0) {
      await page.getByRole('button', { name: 'Save' }).click();
      await page.waitForTimeout(800);
    }
  }

  await page.waitForSelector('.jss_worksheet', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(400);

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const nav = document.querySelector('nav[aria-label="Primary"]');
    // The last thing the page renders above the nav is the sheet tabs row.
    const addSheet = document.querySelector('[aria-label="Add sheet"]');
    const tabs = addSheet ? addSheet.parentElement : null;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      navTop: nav ? nav.getBoundingClientRect().top : null,
      tabsBottom: tabs ? tabs.getBoundingClientRect().bottom : null
    };
  });

  const overflow = Math.max(metrics.scrollWidth, metrics.bodyScrollWidth) - metrics.clientWidth;
  const overlap =
    metrics.navTop !== null && metrics.tabsBottom !== null ? metrics.tabsBottom - metrics.navTop : null;

  const ok = overflow <= 0 && (overlap === null || overlap <= 1) && consoleErrors.length === 0;
  if (!ok) failed = true;

  console.log(
    `${vp.name}: overflowX=${overflow}px, contentBelowNav=${overlap}px, consoleErrors=${consoleErrors.length}${ok ? '' : ' <-- FAIL'}`
  );
  if (consoleErrors.length) console.log('  errors:', consoleErrors.slice(0, 3));
  await context.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
