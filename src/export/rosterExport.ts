import type { ExportFormat } from './types'
import { exportTheme } from './exportTheme'
import type { RosterStudentRow, RosterSubject } from '../lib/roster/compute'

export interface RosterPayload {
  schoolName?: string
  teacherName?: string
  className: string
  grade: number
  section: string
  semester: 1 | 2
  academicYear: string
  dateStr: string
  subjects: RosterSubject[]
  students: RosterStudentRow[]
}

function getRosterFileName(payload: RosterPayload, ext: string): string {
  const sem = payload.semester === 1 ? 'Sem I' : 'Sem II'
  const parts = [payload.className, 'Roster', sem, payload.dateStr]
  return `${parts.join('_').replace(/\s+/g, '_')}.${ext}`
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const normalized = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const value = Number.parseInt(normalized, 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

// ─── Public entry ─────────────────────────────────────────────────────
export async function exportRosterData(
  format: ExportFormat,
  payload: RosterPayload,
  signal?: { aborted: boolean },
): Promise<void> {
  if (signal?.aborted) return

  if (format === 'csv') {
    exportRosterCsv(payload)
    return
  }

  if (format === 'xlsx') {
    const XLSX = await import('xlsx-js-style')
    if (signal?.aborted) return
    exportRosterXlsx(payload, XLSX)
    return
  }

  if (format === 'pdf') {
    const { jsPDF } = await import('jspdf')
    const autoTableModule = await import('jspdf-autotable')
    const { ethiopicFontBase64 } = await import('./ethiopicFont')
    if (signal?.aborted) return
    exportRosterPdf(payload, jsPDF, autoTableModule, ethiopicFontBase64)
    return
  }
}

// ─── CSV ──────────────────────────────────────────────────────────────
function exportRosterCsv(payload: RosterPayload): void {
  const headers = [
    'NO',
    'Students name',
    'Sex',
    'Age',
    ...payload.subjects.map((s) => `${s.name} /${s.maxScore}`),
    'Total',
    'Avg %',
    'Rank',
  ]

  const rows: Array<Array<string | number>> = [headers]
  for (const student of payload.students) {
    rows.push([
      student.serialNo,
      student.name,
      student.sex,
      student.age,
      ...payload.subjects.map((s) => {
        const v = student.scores[s.id]
        return v !== null && v !== undefined ? v : ''
      }),
      student.total,
      student.average !== null ? student.average : '',
      student.rank !== null ? student.rank : '',
    ])
  }

  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cell === null || cell === undefined ? '' : String(cell)
          if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
          return text
        })
        .join(','),
    )
    .join('\r\n')

  // UTF-8 BOM so Excel opens Amharic/Oromo names correctly
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = getRosterFileName(payload, 'csv')
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── XLSX ─────────────────────────────────────────────────────────────
function exportRosterXlsx(
  payload: RosterPayload,
  XLSX: typeof import('xlsx-js-style'),
): void {
  const headerFillRgb = exportTheme.headerFill.replace('#', '')
  const headerTextRgb = exportTheme.headerText.replace('#', '')
  const altRowRgb = exportTheme.alternateRowFill.replace('#', '')
  const borderRgb = exportTheme.border.replace('#', '')
  const textRgb = exportTheme.text.replace('#', '')

  const headerStyle = {
    font: { bold: true, color: { rgb: headerTextRgb }, sz: 10 },
    fill: { fgColor: { rgb: headerFillRgb } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: borderRgb } },
      bottom: { style: 'thin', color: { rgb: borderRgb } },
      left: { style: 'thin', color: { rgb: borderRgb } },
      right: { style: 'thin', color: { rgb: borderRgb } },
    },
  }
  const dataStyle = {
    font: { color: { rgb: textRgb }, sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: borderRgb } },
      bottom: { style: 'thin', color: { rgb: borderRgb } },
      left: { style: 'thin', color: { rgb: borderRgb } },
      right: { style: 'thin', color: { rgb: borderRgb } },
    },
  }
  const altStyle = {
    ...dataStyle,
    fill: { fgColor: { rgb: altRowRgb } },
  }
  const nameStyle = { ...dataStyle, alignment: { horizontal: 'left', vertical: 'center' } }
  const altNameStyle = { ...altStyle, alignment: { horizontal: 'left', vertical: 'center' } }

  const titleStyle = {
    font: { bold: true, sz: 16, color: { rgb: textRgb } },
    alignment: { horizontal: 'center', vertical: 'center' },
  }
  const subtitleStyle = {
    font: { bold: true, sz: 11, color: { rgb: textRgb } },
    alignment: { horizontal: 'center', vertical: 'center' },
  }
  const metaStyle = {
    font: { sz: 10, color: { rgb: textRgb } },
    alignment: { horizontal: 'left', vertical: 'center' },
  }
  const signatureStyle = {
    font: { sz: 10, color: { rgb: textRgb } },
    alignment: { horizontal: 'left', vertical: 'center' },
  }

  const totalCols = 2 + 2 + payload.subjects.length + 4
  const lastColIdx = totalCols - 1
  const semLabel = payload.semester === 1 ? 'Sem I' : 'Sem II'

  const aoa: Array<Array<unknown>> = []

  // 0 — school name (merged)
  aoa.push([{ v: payload.schoolName ?? '', t: 's', s: titleStyle }, ...Array(lastColIdx).fill('')])
  // 1 — title (merged)
  aoa.push([{ v: 'OFFICIAL MARK SCHEDULE', t: 's', s: subtitleStyle }, ...Array(lastColIdx).fill('')])
  // 2 — spacer
  aoa.push(Array(totalCols).fill(''))
  // 3 — meta line 1 (merged)
  const metaLine1 = `Class: ${payload.className}    |    Semester: ${semLabel}    |    Academic Year: ${payload.academicYear}`
  aoa.push([{ v: metaLine1, t: 's', s: metaStyle }, ...Array(lastColIdx).fill('')])
  // 4 — meta line 2 (merged)
  const teacherPart = payload.teacherName ? `Teacher: ${payload.teacherName}    |    ` : ''
  const metaLine2 = `${teacherPart}Date: ${payload.dateStr}`
  aoa.push([{ v: metaLine2, t: 's', s: metaStyle }, ...Array(lastColIdx).fill('')])
  // 5 — spacer
  aoa.push(Array(totalCols).fill(''))

  // 6 — column headers
  const headerRow = [
    { v: 'NO', t: 's', s: headerStyle },
    { v: 'Students name', t: 's', s: headerStyle },
    { v: 'Sex', t: 's', s: headerStyle },
    { v: 'Age', t: 's', s: headerStyle },
    ...payload.subjects.map((subj) => ({
      v: `${subj.name} /${subj.maxScore}`,
      t: 's',
      s: headerStyle,
    })),
    { v: 'Total', t: 's', s: headerStyle },
    { v: 'Avg %', t: 's', s: headerStyle },
    { v: 'Rank', t: 's', s: headerStyle },
  ]
  aoa.push(headerRow)

  // 7...N — data rows
  payload.students.forEach((student, idx) => {
    const isAlt = idx % 2 === 1
    const rowStyle = isAlt ? altStyle : dataStyle
    const nStyle = isAlt ? altNameStyle : nameStyle

    const cells = [
      { v: student.serialNo, t: 'n', s: rowStyle },
      { v: student.name, t: 's', s: nStyle },
      { v: student.sex, t: 's', s: rowStyle },
      { v: student.age, t: typeof student.age === 'number' ? 'n' : 's', s: rowStyle },
      ...payload.subjects.map((subj) => {
        const val = student.scores[subj.id]
        return {
          v: val !== null ? val : '',
          t: val !== null ? 'n' : 's',
          s: rowStyle,
        }
      }),
      { v: student.total, t: 'n', s: rowStyle },
      {
        v: student.average !== null ? student.average : '',
        t: student.average !== null ? 'n' : 's',
        s: rowStyle,
      },
      {
        v: student.rank !== null ? student.rank : '',
        t: student.rank !== null ? 'n' : 's',
        s: rowStyle,
      },
    ]
    aoa.push(cells)
  })

  // Signature rows
  aoa.push(Array(totalCols).fill(''))
  aoa.push(Array(totalCols).fill(''))
  const sigLine1 = 'Teacher signature: _______________________        Date: ______________'
  aoa.push([{ v: sigLine1, t: 's', s: signatureStyle }, ...Array(lastColIdx).fill('')])
  aoa.push(Array(totalCols).fill(''))
  const sigLine2 = 'Principal signature: _______________________      School stamp: ____________'
  aoa.push([{ v: sigLine2, t: 's', s: signatureStyle }, ...Array(lastColIdx).fill('')])

  const ws = XLSX.utils.aoa_to_sheet(aoa) as import('xlsx-js-style').WorkSheet

  // Merge title / meta / signature rows
  const merges: import('xlsx-js-style').Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: lastColIdx } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: lastColIdx } },
    { s: { r: aoa.length - 2, c: 0 }, e: { r: aoa.length - 2, c: lastColIdx } },
    { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: lastColIdx } },
  ]
  ws['!merges'] = merges

  // Column widths
  const cols: Array<{ wch: number }> = [
    { wch: 5 },       // NO
    { wch: 24 },      // Name
    { wch: 4 },       // Sex
    { wch: 5 },       // Age
  ]
  for (let i = 0; i < payload.subjects.length; i += 1) cols.push({ wch: 10 })
  cols.push({ wch: 8 })   // Total
  cols.push({ wch: 8 })   // Avg %
  cols.push({ wch: 6 })   // Rank
  ws['!cols'] = cols

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, semLabel)
  XLSX.writeFile(wb, getRosterFileName(payload, 'xlsx'))
}

// ─── PDF ──────────────────────────────────────────────────────────────
function exportRosterPdf(
  payload: RosterPayload,
  jsPDF: typeof import('jspdf').jsPDF,
  autoTableModule: unknown,
  ethiopicFontBase64: string,
): void {
  type AutoTableFn = (doc: unknown, options: unknown) => void
  const mod = autoTableModule as { default?: AutoTableFn; autoTable?: AutoTableFn }
  const autoTable: AutoTableFn | undefined = mod.default ?? mod.autoTable
  if (!autoTable) throw new Error('PDF table plugin not available')

  const totalCols = 2 + 2 + payload.subjects.length + 4
  const orientation = totalCols <= 6 ? 'portrait' : 'landscape'
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation })

  doc.addFileToVFS('Ethiopic.ttf', ethiopicFontBase64)
  doc.addFont('Ethiopic.ttf', 'Ethiopic', 'normal')
  doc.addFont('Ethiopic.ttf', 'Ethiopic', 'bold')
  doc.setFont('Ethiopic')

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginLeft = 32
  const marginRight = 32

  const headerRgb = hexToRgb(exportTheme.headerFill)
  const headerTextRgb = hexToRgb(exportTheme.headerText)
  const altRowRgb = hexToRgb(exportTheme.alternateRowFill)
  const borderRgb = hexToRgb(exportTheme.border)
  const textRgb = hexToRgb(exportTheme.text)

  const semLabel = payload.semester === 1 ? 'Sem I' : 'Sem II'

  // Header block
  doc.setFontSize(15)
  doc.setTextColor(...textRgb)
  doc.text(payload.schoolName ?? '', pageWidth / 2, 40, { align: 'center' })

  doc.setFontSize(11)
  doc.text('OFFICIAL MARK SCHEDULE', pageWidth / 2, 58, { align: 'center' })

  doc.setFontSize(9)
  doc.text(
    `Class: ${payload.className}   |   Semester: ${semLabel}   |   Academic Year: ${payload.academicYear}`,
    pageWidth / 2,
    76,
    { align: 'center' },
  )
  const teacherPart = payload.teacherName ? `Teacher: ${payload.teacherName}   |   ` : ''
  doc.text(`${teacherPart}Date: ${payload.dateStr}`, pageWidth / 2, 90, { align: 'center' })

  const headers = [
    'NO',
    'Students name',
    'Sex',
    'Age',
    ...payload.subjects.map((s) => `${s.name} /${s.maxScore}`),
    'Total',
    'Avg %',
    'Rank',
  ]

  const body = payload.students.map((student) => [
    String(student.serialNo),
    student.name,
    student.sex,
    String(student.age ?? ''),
    ...payload.subjects.map((subj) => {
      const v = student.scores[subj.id]
      return v !== null ? String(v) : ''
    }),
    String(student.total),
    student.average !== null ? student.average.toFixed(1) : '',
    student.rank !== null ? String(student.rank) : '',
  ])

  // Column widths scaled to fit printable width
  const naturalWidth = 30 + 120 + 30 + 30 + payload.subjects.length * 50 + 40 + 40 + 40
  const printableWidth = pageWidth - marginLeft - marginRight
  const scale = printableWidth / naturalWidth
  const columnStyles: Record<number, { cellWidth: number; halign?: 'left' | 'center' }> = {
    0: { cellWidth: 30 * scale, halign: 'center' },
    1: { cellWidth: 120 * scale, halign: 'left' },
    2: { cellWidth: 30 * scale, halign: 'center' },
    3: { cellWidth: 30 * scale, halign: 'center' },
  }
  const firstSubjCol = 4
  for (let i = 0; i < payload.subjects.length; i += 1) {
    columnStyles[firstSubjCol + i] = { cellWidth: 50 * scale, halign: 'center' }
  }
  const summaryStart = firstSubjCol + payload.subjects.length
  columnStyles[summaryStart] = { cellWidth: 40 * scale, halign: 'center' }
  columnStyles[summaryStart + 1] = { cellWidth: 40 * scale, halign: 'center' }
  columnStyles[summaryStart + 2] = { cellWidth: 40 * scale, halign: 'center' }

  autoTable(doc, {
    head: [headers],
    body,
    startY: 105,
    margin: { left: marginLeft, right: marginRight },
    theme: 'grid',
    styles: {
      font: 'Ethiopic',
      fontSize: totalCols > 10 ? 7 : 8,
      textColor: textRgb,
      lineColor: borderRgb,
      lineWidth: 0.3,
      halign: 'center',
      valign: 'middle',
      cellPadding: 3,
    },
    headStyles: {
      fillColor: headerRgb,
      textColor: headerTextRgb,
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: altRowRgb,
    },
    columnStyles,
  })

  // Signature block on the last page
  const pageCount = doc.getNumberOfPages()
  doc.setPage(pageCount)
  const lastAutoY = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 200
  const signatureStartY = Math.min(lastAutoY + 40, pageHeight - 100)

  doc.setDrawColor(...borderRgb)
  doc.setFontSize(9)
  doc.setTextColor(...textRgb)

  doc.line(marginLeft, signatureStartY, marginLeft + 160, signatureStartY)
  doc.text('Teacher signature', marginLeft, signatureStartY + 12)

  doc.line(marginLeft + 200, signatureStartY, marginLeft + 360, signatureStartY)
  doc.text('Principal signature', marginLeft + 200, signatureStartY + 12)

  // Stamp box
  doc.rect(pageWidth - marginRight - 100, signatureStartY - 30, 100, 60)
  doc.text('School stamp', pageWidth - marginRight - 50, signatureStartY + 40, { align: 'center' })

  // Page numbers on every page
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...textRgb)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginRight, pageHeight - 20, { align: 'right' })
  }

  doc.save(getRosterFileName(payload, 'pdf'))
}
