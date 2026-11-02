import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = 'docs/screenshots/e2e';
const STEP_LIMIT_MS = 90_000;
const STUDENTS = [
  ['1', 'Abebe', 'M', '16'],
  ['2', 'Sara', 'F', '15'],
  ['3', 'Kebede', 'M', '17']
];

await mkdir(OUT, { recursive: true });

async function reachable() {
  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

let server = null;
if (!(await reachable())) {
  server = spawn('npm', ['run', 'dev', '--', '--port', '5173', '--strictPort'], {
    stdio: 'ignore'
  });
  const deadline = Date.now() + 30_000;
  while (!(await reachable())) {
    if (Date.now() > deadline) throw new Error(`dev server never came up at ${BASE}`);
    await new Promise((r) => setTimeout(r, 300));
  }
}

const results = [];
const consoleErrors = [];

async function step(name, fn) {
  const started = Date.now();
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`step exceeded ${STEP_LIMIT_MS / 1000}s`)), STEP_LIMIT_MS)
      )
    ]);
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log(`PASS ${name} (${Date.now() - started}ms)`);
  } catch (error) {
    results.push({ name, ok: false, ms: Date.now() - started, error: String(error?.message ?? error) });
    console.log(`FAIL ${name} (${Date.now() - started}ms): ${String(error?.message ?? error).split('\n')[0]}`);
    throw error;
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true
});
const page = await context.newPage();
page.setDefaultTimeout(STEP_LIMIT_MS);
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(String(e)));

let shotIndex = 0;
async function shot(name) {
  shotIndex += 1;
  const file = `${OUT}/${String(shotIndex).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  screenshot ${file}`);
}

// The worksheet table puts the row numbers in the first cell of every row and a
// header row in tbody; locate the header "NO" cell once and derive the rest.
async function gridOrigin() {
  return page.evaluate(() => {
    const cells = Array.from(document.querySelectorAll('.jss_worksheet tbody td'));
    const no = cells.find((td) => (td.textContent ?? '').trim() === 'NO');
    if (!no) return null;
    const row = no.parentElement;
    const body = row?.parentElement;
    if (!row || !body) return null;
    return {
      rowIdx: Array.from(body.children).indexOf(row),
      cellIdx: Array.from(row.children).indexOf(no)
    };
  });
}

async function gridCell(x, y) {
  const origin = await gridOrigin();
  if (!origin) throw new Error('grid header row not found');
  return page
    .locator('.jss_worksheet tbody tr')
    .nth(origin.rowIdx + y)
    .locator('td')
    .nth(origin.cellIdx + x);
}

async function gridRowText(y) {
  const origin = await gridOrigin();
  if (!origin) throw new Error('grid header row not found');
  return page.evaluate(
    ({ rowIdx, cellIdx, y }) => {
      const body = document.querySelector('.jss_worksheet tbody');
      const row = body?.children[rowIdx + y];
      if (!row) return null;
      return Array.from(row.children)
        .slice(cellIdx)
        .map((td) => (td.textContent ?? '').trim());
    },
    { ...origin, y }
  );
}

async function typeCell(x, y, text) {
  const cell = await gridCell(x, y);
  await cell.click();
  await page.keyboard.type(text, { delay: 15 });
  await page.keyboard.press('Tab');
}

async function waitForSaved() {
  await page.getByText('Saving...', { exact: true }).first().waitFor({ timeout: STEP_LIMIT_MS }).catch(() => {});
  await page.getByText('Saved', { exact: true }).first().waitFor({ timeout: STEP_LIMIT_MS });
}

try {
  await step('clear-storage', async () => {
    await page.goto(BASE);
    await page.evaluate(async () => {
      localStorage.clear();
      await new Promise((resolve) => {
        const req = indexedDB.deleteDatabase('markbook');
        req.onsuccess = req.onerror = req.onblocked = () => resolve();
      });
    });
    await shot('storage-cleared');
  });

  await step('open-add-record', async () => {
    await page.goto(`${BASE}/#/add-record`);
    await page.getByText('Create a class to start').waitFor();
    await shot('add-record-empty');
  });

  await step('create-class', async () => {
    await page.getByRole('button', { name: 'New class' }).first().click();
    await page.getByRole('button', { name: 'New class' }).last().click();
    const form = page.locator('form');
    await form.waitFor();
    const inputs = form.locator('input');
    const values = ['11A', '11', 'A', '2018 EC', 'School', 'Teacher'];
    for (let i = 0; i < values.length; i += 1) await inputs.nth(i).fill(values[i]);
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByText('11A - I').waitFor();
    await shot('class-created');
  });

  await step('add-roster-sheet', async () => {
    await page.getByRole('button', { name: 'Add sheet' }).click();
    await page.getByRole('button', { name: 'Class roster template' }).click();
    await page.locator('.jss_worksheet').waitFor();
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll('.jss_worksheet tbody td')).some(
        (td) => (td.textContent ?? '').trim() === 'Students name'
      )
    );
    await shot('roster-sheet');
  });

  await step('type-3-students', async () => {
    for (let r = 0; r < STUDENTS.length; r += 1) {
      const row = STUDENTS[r];
      for (let c = 0; c < row.length; c += 1) await typeCell(c, r + 1, row[c]);
    }
    await shot('students-typed');
  });

  await step('wait-for-saved', async () => {
    await waitForSaved();
    await shot('saved');
  });

  await step('open-attendance', async () => {
    await page.getByRole('button', { name: 'Attendance' }).click();
    await page.locator('.jss_worksheet').waitFor();
    await shot('attendance');
  });

  await step('names-listed', async () => {
    for (const [, name] of STUDENTS) {
      await page.locator('.jss_worksheet tbody td', { hasText: name }).first().waitFor();
    }
    const row1 = await gridRowText(1);
    const row2 = await gridRowText(2);
    const row3 = await gridRowText(3);
    if (row1?.[1] !== 'Abebe' || row2?.[1] !== 'Sara' || row3?.[1] !== 'Kebede') {
      throw new Error(`unexpected rows: ${JSON.stringify([row1, row2, row3])}`);
    }
    await shot('names-listed');
  });

  await step('tick-present-then-absent', async () => {
    await (await gridCell(5, 1)).click();
    await page.waitForFunction(() => {
      const cells = Array.from(document.querySelectorAll('.jss_worksheet tbody td')).map((td) =>
        (td.textContent ?? '').trim()
      );
      return cells.includes('\u2713');
    });
    await (await gridCell(6, 1)).click();
    await page.waitForFunction(() => {
      const rows = Array.from(document.querySelectorAll('.jss_worksheet tbody tr'));
      const cells = Array.from(rows[2]?.children ?? []).map((td) => (td.textContent ?? '').trim());
      const ticks = cells.filter((t) => t === '\u2713').length;
      return ticks === 1;
    });
    const row = await gridRowText(1);
    if (row?.[5] !== '' || row?.[6] !== '\u2713') {
      throw new Error(`row 1 after ticks is ${JSON.stringify(row)}`);
    }
    await waitForSaved();
    await shot('ticks-saved');
  });

  await step('reload-persists', async () => {
    await page.reload();
    await page.locator('.jss_worksheet').waitFor();
    await page.waitForFunction(() => {
      const rows = Array.from(document.querySelectorAll('.jss_worksheet tbody tr'));
      const cells = Array.from(rows[2]?.children ?? []).map((td) => (td.textContent ?? '').trim());
      return cells[6] === '\u2713';
    });
    const row = await gridRowText(1);
    if (row?.[5] !== '' || row?.[6] !== '\u2713') {
      throw new Error(`row 1 after reload is ${JSON.stringify(row)}`);
    }
    if (row?.[1] !== 'Abebe') throw new Error(`expected Abebe after reload, got ${JSON.stringify(row)}`);
    await shot('reload-persists');
  });
} catch {
  await shot('failure').catch(() => {});
} finally {
  await browser.close();
  if (server) server.kill('SIGTERM');
}

const failed = results.filter((r) => !r.ok);
console.log('\n--- e2e summary ---');
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name} ${r.ms}ms${r.error ? ` - ${r.error}` : ''}`);
console.log(`console errors: ${consoleErrors.length}`);
for (const e of consoleErrors.slice(0, 10)) console.log(`  ${e.split('\n')[0]}`);
process.exit(failed.length ? 1 : 0);
