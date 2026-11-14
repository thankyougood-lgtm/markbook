#!/usr/bin/env bash
# Run from anywhere: bash fix-roster-e2.sh
# Creates auditRoster.ts, rewrites writeRosterXlsx.ts, patches AddRecordPage.tsx (exact text only).

cd ~/2026/markbook || { echo "STOP: folder ~/2026/markbook not found"; exit 1; }

branch=$(git branch --show-current)
if [ "$branch" = "main" ] || [ -z "$branch" ]; then
  echo "STOP: you are on '$branch'. Switch to your feature branch first (git switch <branch>)."; exit 1
fi
echo "Branch: $branch"

if [ ! -f src/pages/AddRecord/AddRecordPage.tsx ]; then
  echo "STOP: src/pages/AddRecord/AddRecordPage.tsx not found"; exit 1
fi

if [ ! -d node_modules/jszip ]; then
  echo "Installing jszip (needed for print area and page breaks)..."
  npm install jszip || { echo "STOP: npm install jszip failed (no internet?)"; exit 1; }
fi

mkdir -p src/export/roster

# =====================================================================
# 1. auditRoster.ts (new file)
# =====================================================================
cat > src/export/roster/auditRoster.ts << 'EOF_AUDIT'
import type { RosterModel } from './buildRoster'

export interface AuditIssue {
  severity: 'error' | 'warning'
  message: string
}

/** Optional: how many numeric marks exist in the database (mapped to a roster column). */
export interface AuditExpected {
  sem1Marks?: number
  sem2Marks?: number
}

// Minimal shape the audit relies on (rows are positional: 0 = I, 1 = II, 2 = AV).
interface AuditRow {
  subjectValues: Record<string, number | null | undefined>
  total: number | null | undefined
  average: number | null | undefined
  rank: number | null | undefined
  conduct?: unknown
  remark?: unknown
}
interface AuditStudent {
  no: number
  name?: string
  rows: AuditRow[]
}
interface AuditModelShape {
  subjects: { key: string; label?: string }[]
  students: AuditStudent[]
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const ROW_NAMES = ['I', 'II', 'AV']

/**
 * Independent re-check of a roster model. It recomputes totals, averages, AV and ranks
 * with plain loops (no shared helpers with buildRoster) and reports every disagreement.
 */
export function auditRoster(model: RosterModel, expected: AuditExpected = {}): AuditIssue[] {
  const m = model as unknown as AuditModelShape
  const issues: AuditIssue[] = []
  const err = (message: string) => issues.push({ severity: 'error', message })

  if (!m.students || m.students.length === 0) {
    issues.push({ severity: 'warning', message: 'The roster has no students.' })
    return issues
  }

  // raw (unrounded) averages per row type, used for ranking
  const rawAvg: (number | null)[][] = [[], [], []]

  m.students.forEach((st, idx) => {
    const who = `${st.name || 'Student'} (NO ${st.no})`
    if (st.no !== idx + 1) err(`${who}: NO should be ${idx + 1}.`)
    if (!st.rows || st.rows.length !== 3) {
      err(`${who}: must have exactly 3 rows (I, II, AV).`)
      rawAvg[0].push(null); rawAvg[1].push(null); rawAvg[2].push(null)
      return
    }

    for (let k = 0; k < 3; k++) {
      const row = st.rows[k]
      const nums = m.subjects.map((s) => row.subjectValues?.[s.key]).filter(isNum)
      const sum = nums.reduce((a, b) => a + b, 0)

      if (nums.length === 0) {
        if (row.total != null) err(`${who} row ${ROW_NAMES[k]}: total should be empty (no marks).`)
        if (row.average != null) err(`${who} row ${ROW_NAMES[k]}: average should be empty (no marks).`)
        rawAvg[k].push(null)
      } else {
        if (!isNum(row.total) || Math.abs(row.total - sum) > 0.011) {
          err(`${who} row ${ROW_NAMES[k]}: total is ${row.total} but the marks add up to ${sum}.`)
        }
        const exact = sum / nums.length
        if (!isNum(row.average) || Math.abs(row.average - exact) > 0.5 + 1e-9) {
          err(`${who} row ${ROW_NAMES[k]}: average is ${row.average} but should be about ${exact.toFixed(2)}.`)
        }
        rawAvg[k].push(exact)
      }

      if (row.conduct === 0) err(`${who} row ${ROW_NAMES[k]}: Conduct is 0 but must stay empty.`)
      if (row.remark === 0) err(`${who} row ${ROW_NAMES[k]}: Remark is 0 but must stay empty.`)
    }

    // AV subject = mean of I and II when both exist, otherwise empty
    for (const s of m.subjects) {
      const a = st.rows[0].subjectValues?.[s.key]
      const b = st.rows[1].subjectValues?.[s.key]
      const av = st.rows[2].subjectValues?.[s.key]
      if (isNum(a) && isNum(b)) {
        if (!isNum(av) || Math.abs(av - (a + b) / 2) > 0.0051) {
          err(`${who}: AV of "${s.label ?? s.key}" should be ${(a + b) / 2} (got ${av}).`)
        }
      } else if (isNum(av)) {
        err(`${who}: AV of "${s.label ?? s.key}" must be empty because one semester is blank.`)
      }
    }
  })

  // Ranks: 1 + number of students with a strictly greater UNROUNDED average.
  // A 0.01 tolerance zone is allowed only for the 2-decimal rounding of the cells.
  for (let k = 0; k < 3; k++) {
    const avgs = rawAvg[k]
    m.students.forEach((st, i) => {
      if (!st.rows || st.rows.length !== 3) return
      const rank = st.rows[k].rank
      const mine = avgs[i]
      const who = `${st.name || 'Student'} (NO ${st.no})`
      if (mine === null) {
        if (rank != null) err(`${who} row ${ROW_NAMES[k]}: rank should be empty (no marks).`)
        return
      }
      let low = 1
      let high = 1
      avgs.forEach((other, j) => {
        if (j === i || other === null) return
        if (other > mine + 0.01) low++
        if (other > mine - 0.01) high++
      })
      if (!isNum(rank) || rank < low || rank > high) {
        err(`${who} row ${ROW_NAMES[k]}: rank is ${rank} but should be ${low === high ? low : `${low} to ${high}`}.`)
      }
    })
  }

  // No mark left behind
  const countCells = (k: number) =>
    m.students.reduce(
      (acc, st) => acc + (st.rows?.[k] ? m.subjects.filter((s) => isNum(st.rows[k].subjectValues?.[s.key])).length : 0),
      0,
    )
  if (expected.sem1Marks !== undefined) {
    const found = countCells(0)
    if (found !== expected.sem1Marks) {
      err(`Semester I: ${expected.sem1Marks} marks exist but ${found} are in the roster (some were left out or merged).`)
    }
  }
  if (expected.sem2Marks !== undefined) {
    const found = countCells(1)
    if (found !== expected.sem2Marks) {
      err(`Semester II: ${expected.sem2Marks} marks exist but ${found} are in the roster (some were left out or merged).`)
    }
  }

  return issues
}
EOF_AUDIT
echo "OK: auditRoster.ts created"

# =====================================================================
# 2. writeRosterXlsx.ts (typed cells, every cell bordered, no border on
#    the title, print area, fit to page, page breaks, freeze panes)
# =====================================================================
cat > src/export/roster/writeRosterXlsx.ts << 'EOF_XLSX'
import type { RosterModel } from './buildRoster'
import { ROSTER_LABELS, SEM_LABELS } from './labels'

export interface RosterXlsxInput {
  model: RosterModel
  schoolName: string
  className: string
  grade: number | string
  section: string
  academicYear: string
}

// Print layout constants (change here only)
export const STUDENTS_PER_PAGE_PORTRAIT = 12
export const STUDENTS_PER_PAGE_LANDSCAPE = 8
const MAX_PORTRAIT_COLUMNS = 14

type XlsxCell = { v: string | number; t: 's' | 'n'; s: Record<string, unknown> }

/** Number cells only for real finite numbers; everything else is a text/empty cell. */
function makeCell(value: unknown, style: Record<string, unknown>): XlsxCell {
  if (typeof value === 'number' && Number.isFinite(value)) return { v: value, t: 'n', s: style }
  if (value === null || value === undefined) return { v: '', t: 's', s: style }
  return { v: String(value), t: 's', s: style }
}

interface PrintOptions {
  lastCol: string
  lastRow: number
  studentCount: number
  landscape: boolean
  breakEvery: number
}

/**
 * SheetJS community build cannot write print settings, so the finished file is opened
 * with JSZip and the XML is patched. If anything fails, the unpatched file is returned
 * (a valid roster without print setup) and a warning is logged.
 */
async function applyPrintSetup(data: Uint8Array, o: PrintOptions): Promise<Uint8Array> {
  try {
    const mod: any = await import('jszip')
    const JSZip = mod.default ?? mod
    const zip = await JSZip.loadAsync(data)
    const sheetFile = zip.file('xl/worksheets/sheet1.xml')
    const bookFile = zip.file('xl/workbook.xml')
    if (!sheetFile || !bookFile) return data
    let sheet: string = await sheetFile.async('string')
    let book: string = await bookFile.async('string')

    // 1. fit to page (inside sheetPr, which must come first in the worksheet)
    if (sheet.includes('<sheetPr/>')) {
      sheet = sheet.replace('<sheetPr/>', '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>')
    } else if (sheet.includes('</sheetPr>')) {
      sheet = sheet.replace('</sheetPr>', '<pageSetUpPr fitToPage="1"/></sheetPr>')
    } else if (!sheet.includes('<sheetPr')) {
      const open = sheet.indexOf('<worksheet')
      const end = sheet.indexOf('>', open) + 1
      sheet = sheet.slice(0, end) + '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' + sheet.slice(end)
    }

    // 2. freeze panes: header rows 1-2 and columns A-B
    if (sheet.includes('<sheetView workbookViewId="0"/>')) {
      sheet = sheet.replace(
        '<sheetView workbookViewId="0"/>',
        '<sheetView workbookViewId="0"><pane xSplit="2" ySplit="2" topLeftCell="C3" activePane="bottomRight" state="frozen"/><selection pane="bottomRight"/></sheetView>',
      )
    }

    // 3. print options, page setup, footer, row breaks (schema order matters)
    const pageSetup = `<pageSetup paperSize="9" orientation="${o.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>`
    const footer =
      '<headerFooter><oddFooter>&amp;C&amp;"Times New Roman,Regular"&amp;9Page &amp;P of &amp;N</oddFooter></headerFooter>'
    const breaks: number[] = []
    for (let k = o.breakEvery; k < o.studentCount; k += o.breakEvery) breaks.push(2 + k * 3)
    const rowBreaks = breaks.length
      ? `<rowBreaks count="${breaks.length}" manualBreakCount="${breaks.length}">${breaks
          .map((r) => `<brk id="${r}" max="16383" man="1"/>`)
          .join('')}</rowBreaks>`
      : ''
    const margins = '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.6" header="0.3" footer="0.3"/>'
    const printOptions = '<printOptions horizontalCentered="1"/>'

    const pmStart = sheet.indexOf('<pageMargins')
    if (pmStart >= 0) {
      const pmEnd = sheet.indexOf('/>', pmStart) + 2
      sheet =
        sheet.slice(0, pmStart) +
        printOptions +
        margins +
        pageSetup +
        footer +
        rowBreaks +
        sheet.slice(pmEnd)
    } else {
      sheet = sheet.replace('</worksheet>', printOptions + margins + pageSetup + footer + rowBreaks + '</worksheet>')
    }

    // 4. print area and repeated header row
    if (!book.includes('<definedNames')) {
      const names =
        '<definedNames>' +
        `<definedName name="_xlnm.Print_Area" localSheetId="0">Roster!$A$1:$${o.lastCol}$${o.lastRow}</definedName>` +
        '<definedName name="_xlnm.Print_Titles" localSheetId="0">Roster!$2:$2</definedName>' +
        '</definedNames>'
      book = book.replace('</sheets>', '</sheets>' + names)
    }

    zip.file('xl/worksheets/sheet1.xml', sheet)
    zip.file('xl/workbook.xml', book)
    return (await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })) as Uint8Array
  } catch (err) {
    console.warn('[ROSTER XLSX] Print setup skipped:', err)
    return data
  }
}

export async function writeRosterXlsx(input: RosterXlsxInput): Promise<Uint8Array> {
  const XLSX = await import('xlsx-js-style')
  const { model, schoolName, grade, section, academicYear } = input

  const title = `${schoolName ? schoolName + ' ' : ''}roster for grade ${grade} sec "${section}"  academic year ${academicYear}`

  const headers: string[] = [
    ROSTER_LABELS.NO,
    ROSTER_LABELS.NAME,
    ROSTER_LABELS.SEX,
    ROSTER_LABELS.AGE,
    ROSTER_LABELS.SEMESTER,
    ...model.subjects.map((sub) => String(sub?.label ?? sub?.key ?? '')),
    ROSTER_LABELS.TOTAL,
    ROSTER_LABELS.AVERAGE,
    ROSTER_LABELS.RANK,
    ROSTER_LABELS.CONDUCT,
    ROSTER_LABELS.ABSENTS,
    ROSTER_LABELS.REMARK,
  ]

  const line = { style: 'thin', color: { rgb: '000000' } }
  const borders = { top: line, bottom: line, left: line, right: line }
  const font = { name: 'Times New Roman', sz: 11, color: { rgb: '000000' } }

  const baseStyle = { font, border: borders, alignment: { vertical: 'bottom', horizontal: 'center' } }
  const textStyle = { font, border: borders, alignment: { vertical: 'bottom', horizontal: 'left' } }
  const boldStyle = { ...baseStyle, font: { ...font, bold: true } }
  const boldTextStyle = { ...textStyle, font: { ...font, bold: true } }
  const headerStyle = {
    font: { ...font, bold: true },
    border: borders,
    alignment: { textRotation: 90, vertical: 'bottom', horizontal: 'center' },
  }
  const headerNameStyle = {
    font: { ...font, bold: true },
    border: borders,
    alignment: { textRotation: 0, vertical: 'bottom', horizontal: 'left' },
  }
  // The title line has NO border and no fill (like the school's sample)
  const titleStyle = { font, alignment: { vertical: 'center', horizontal: 'left' } }

  const wsData: XlsxCell[][] = []

  // Row 1: title (merged later; every column still gets a cell)
  wsData.push(headers.map((_, i) => makeCell(i === 0 ? title : '', titleStyle)))

  // Row 2: header
  wsData.push(headers.map((h) => makeCell(h, h === ROSTER_LABELS.NAME ? headerNameStyle : headerStyle)))

  // Student rows: 3 per student, EVERY coordinate gets a bordered cell (even empty ones)
  for (const student of model.students) {
    for (let r = 0; r < 3; r++) {
      const row = student.rows[r]
      const isAV = row.semester === 'AV'
      const rowStyle = isAV ? boldStyle : baseStyle
      const out: XlsxCell[] = []

      out.push(makeCell(r === 0 ? student.no : '', baseStyle))
      out.push(makeCell(r === 0 ? student.name : '', boldTextStyle))
      out.push(makeCell(r === 0 ? student.sex : '', baseStyle))
      out.push(makeCell(r === 0 ? student.age : '', baseStyle))
      out.push(makeCell(SEM_LABELS[row.semester], rowStyle))

      for (const sub of model.subjects) out.push(makeCell(row.subjectValues[sub.key], rowStyle))

      out.push(makeCell(row.total, boldStyle))
      out.push(makeCell(row.average, boldStyle))
      out.push(makeCell(row.rank, boldStyle))
      out.push(makeCell(row.conduct, rowStyle))
      out.push(makeCell(row.absents, rowStyle))
      out.push(makeCell(row.remark, rowStyle))

      wsData.push(out)
    }
  }

  const ws: any = XLSX.utils.aoa_to_sheet(wsData as any[][])

  // Merges: title, and NO / name / Sex / Age over the 3 rows of each student
  const merges: any[] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }]
  for (let i = 0; i < model.students.length; i++) {
    const start = 2 + i * 3
    for (let c = 0; c <= 3; c++) merges.push({ s: { r: start, c }, e: { r: start + 2, c } })
  }
  ws['!merges'] = merges

  ws['!cols'] = [
    { wch: 5 }, { wch: 30 }, { wch: 5 }, { wch: 5 }, { wch: 9 },
    ...model.subjects.map(() => ({ wch: 8 })),
    { wch: 8 }, { wch: 9 }, { wch: 6 }, { wch: 9 }, { wch: 9 }, { wch: 14 },
  ]

  // Header height from the longest vertical label (70 to 140 pt)
  const longest = Math.max(4, ...headers.filter((h) => h !== ROSTER_LABELS.NAME).map((h) => h.length))
  const headerHeight = Math.min(140, Math.max(70, Math.round(longest * 6.5 + 12)))
  const rows: any[] = []
  rows[0] = { hpt: 20 }
  rows[1] = { hpt: headerHeight }
  for (let i = 2; i < wsData.length; i++) rows[i] = { hpt: 15 }
  ws['!rows'] = rows

  ws['!margins'] = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Roster')

  const raw = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const bytes = new Uint8Array(raw)

  const landscape = headers.length > MAX_PORTRAIT_COLUMNS
  return applyPrintSetup(bytes, {
    lastCol: XLSX.utils.encode_col(headers.length - 1),
    lastRow: wsData.length,
    studentCount: model.students.length,
    landscape,
    breakEvery: landscape ? STUDENTS_PER_PAGE_LANDSCAPE : STUDENTS_PER_PAGE_PORTRAIT,
  })
}
EOF_XLSX
echo "OK: writeRosterXlsx.ts rewritten"

# =====================================================================
# 3. AddRecordPage.tsx: exact-text swaps only (stops if any text is missing)
# =====================================================================
cat > /tmp/patch_roster_page.mjs << 'EOF_PATCH'
import fs from 'fs'
const p = 'src/pages/AddRecord/AddRecordPage.tsx'
let c = fs.readFileSync(p, 'utf8')

if (c.includes('mappedIds1')) {
  console.log('Page already patched, nothing to do.')
  process.exit(0)
}

const auditCall = `const studentIdSet = new Set(studentIds)
      const mappedIds1 = new Set<number>()
      const mappedIds2 = new Set<number>()
      for (const r of rosterSubjects as any[]) {
        if (r?.sem1SubjectId != null) mappedIds1.add(Number(r.sem1SubjectId))
        if (r?.sem2SubjectId != null) mappedIds2.add(Number(r.sem2SubjectId))
      }
      const countMarks = (flat: any[], ids: Set<number>) =>
        ids.size === 0
          ? undefined
          : flat.filter((m) => typeof m.value === 'number' && studentIdSet.has(m.studentId) && ids.has(m.subjectId)).length
      const issues = auditRoster(model, {
        sem1Marks: countMarks(flat1, mappedIds1),
        sem2Marks: countMarks(flat2, mappedIds2),
      })`

const swaps = [
  // marks always come from the class being exported, never from another class
  ['sem1ClassId ? await subjectRepo.listSubjects(sem1ClassId) : []', 'sem1ClassId ? await subjectRepo.listSubjects(activeClass.id) : []'],
  ['sem2ClassId ? await subjectRepo.listSubjects(sem2ClassId) : []', 'sem2ClassId ? await subjectRepo.listSubjects(activeClass.id) : []'],
  ['sem1ClassId ? await scoreRepo.listScoresForSemester(sem1ClassId, 1) : {}', 'sem1ClassId ? await scoreRepo.listScoresForSemester(activeClass.id, 1) : {}'],
  ['sem2ClassId ? await scoreRepo.listScoresForSemester(sem2ClassId, 2) : {}', 'sem2ClassId ? await scoreRepo.listScoresForSemester(activeClass.id, 2) : {}'],
  // audit now also checks "no mark left behind"
  ['const issues = auditRoster(model)', auditCall],
]

const missing = swaps.filter(([from]) => !c.includes(from)).map(([from]) => from)
if (missing.length) {
  console.error('STOP: this text was not found in ' + p + ' (nothing was changed in that file):')
  for (const m of missing) console.error('  - ' + m)
  process.exit(1)
}
for (const [from, to] of swaps) c = c.split(from).join(to)
fs.writeFileSync(p, c)
console.log('OK: AddRecordPage.tsx updated (marks from active class, audit with mark counts)')
EOF_PATCH
node /tmp/patch_roster_page.mjs || echo "WARNING: page patch did not apply (see message above). auditRoster.ts and the Excel writer are in place."

# =====================================================================
# 4. translations-review.md note (only if the file exists)
# =====================================================================
if [ -f translations-review.md ] && ! grep -q "addRecord.sheetLabel" translations-review.md; then
  printf '\n- addRecord.sheetLabel (column header, now "Remark"): am "ማስታወሻ", om "Yaadannoo" - please review\n' >> translations-review.md
  echo "OK: translations-review.md updated"
fi

# =====================================================================
# 5. Checks
# =====================================================================
echo ""
if ! grep -q "sem1SubjectId" src/export/roster/autoMapSubjects.ts 2>/dev/null; then
  echo "NOTE: autoMapSubjects.ts has no 'sem1SubjectId' field; the 'no mark left behind' count is skipped until it does."
fi
echo "=== TypeScript ==="
npx tsc -b 2>&1 | tail -15
echo "=== Tests ==="
npm test 2>&1 | tail -25
echo ""
git status --short
git diff --stat
