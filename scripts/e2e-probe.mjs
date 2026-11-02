import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';

async function reachable() {
  try {
    return (await fetch(BASE, { signal: AbortSignal.timeout(2000) })).ok;
  } catch {
    return false;
  }
}

let server = null;
if (!(await reachable())) {
  server = spawn('npm', ['run', 'dev', '--', '--port', '5173', '--strictPort'], { stdio: 'ignore' });
  const deadline = Date.now() + 30000;
  while (!(await reachable())) {
    if (Date.now() > deadline) throw new Error('no dev server');
    await new Promise((r) => setTimeout(r, 300));
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
page.setDefaultTimeout(60000);
page.on('console', (m) => console.log('console:', m.type(), m.text()));
page.on('pageerror', (e) => console.log('pageerror:', String(e)));

await page.goto(BASE);
await page.evaluate(async () => {
  localStorage.clear();
  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase('markbook');
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
});
await page.goto(`${BASE}/#/add-record`);
await page.getByRole('button', { name: 'New class' }).first().click();
await page.getByRole('button', { name: 'New class' }).last().click();
const inputs = page.locator('form input');
const values = ['11A', '11', 'A', '2018 EC', 'School', 'Teacher'];
for (let i = 0; i < values.length; i += 1) await inputs.nth(i).fill(values[i]);
await page.getByRole('button', { name: 'Save' }).click();
await page.getByRole('button', { name: 'Add sheet' }).click();
await page.getByRole('button', { name: 'Class roster template' }).click();
await page.locator('.jss_worksheet').waitFor();
await page.waitForTimeout(800);
await page.getByRole('button', { name: 'Attendance' }).click();
await page.locator('.jss_worksheet').waitFor();
await page.waitForTimeout(800);

const info = await page.evaluate(() => {
  const table = document.querySelector('table.jss_worksheet');
  const thead = table?.querySelector('thead');
  const tbody = table?.querySelector('tbody');
  const rows = Array.from(tbody?.children ?? []);
  const describe = (tr) =>
    Array.from(tr.children).map((td) => ({ cls: td.className, text: (td.textContent ?? '').trim() }));
  return {
    head: table?.outerHTML.slice(0, 400),
    theadRows: Array.from(thead?.children ?? []).map(describe),
    tbodyRowCount: rows.length,
    firstRows: rows.slice(0, 4).map(describe)
  };
});
console.log(JSON.stringify(info, null, 2));

await page.evaluate(() => {
  window.__taps = [];
  const host = document.querySelector('.sheet-grid');
  host.addEventListener('click', (e) => {
    const td = e.target.closest('td');
    const row = td?.parentElement;
    const body = row?.parentElement;
    window.__taps.push({
      tdText: td?.textContent?.trim(),
      rowIdxRaw: row && body ? Array.from(body.children).indexOf(row) : null,
      cellIdxRaw: row && td ? Array.from(row.children).indexOf(td) : null,
      bodyParentClass: body?.parentElement?.className ?? null
    });
  });
});

const clickResult = await page.evaluate(() => {
  const body = document.querySelector('.jss_worksheet tbody');
  const cells = Array.from(document.querySelectorAll('.jss_worksheet tbody td'));
  const no = cells.find((td) => (td.textContent ?? '').trim() === 'NO');
  const row = no.parentElement;
  const rowIdx = Array.from(body.children).indexOf(row);
  const cellIdx = Array.from(row.children).indexOf(no);
  const targetRow = body.children[rowIdx + 1];
  const td = targetRow.children[cellIdx + 5];
  td.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return { rowIdx, cellIdx, clickedText: td.textContent };
});
console.log('click result', JSON.stringify(clickResult));
await page.waitForTimeout(1000);
console.log('taps', JSON.stringify(await page.evaluate(() => window.__taps)));
console.log(
  'rows after click',
  JSON.stringify(
    await page.evaluate(() =>
      Array.from(document.querySelectorAll('.jss_worksheet tbody tr'))
        .slice(0, 3)
        .map((tr) => Array.from(tr.children).slice(0, 10).map((td) => (td.textContent ?? '').trim()))
    )
  )
);

await browser.close();
if (server) server.kill('SIGTERM');
