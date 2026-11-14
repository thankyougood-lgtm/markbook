import type { ExportFormat } from './types'
import { exportTheme } from './exportTheme'

export interface AttendanceExportStudent {
  serialNo: number
  name: string
  statuses: Array<'P' | 'A' | 'L' | 'E' | ''>
  summary: { P: number; A: number; L: number; E: number }
}

export interface AttendanceExportPayload {
  schoolName?: string
  className: string
  semester: 1 | 2
  academicYear?: string
  dateStr: string
  sessionHeaders: string[]
  students: AttendanceExportStudent[]
}

function getAttendanceFileName(payload: AttendanceExportPayload, ext: string): string {
  const sem = payload.semester === 1 ? 'Sem I' : 'Sem II'
  const parts = [payload.className, 'Attendance', sem, payload.dateStr]
  return `${parts.join('_').replace(/\s+/g, '_')}.${ext}`
}

function buildHeaders(payload: AttendanceExportPayload): string[] {
  return ['NO', 'Student Name', ...payload.sessionHeaders, 'P', 'A', 'L', 'E']
}

function buildRow(
  student: AttendanceExportStudent,
): Array<string | number> {
  return [
    student.serialNo,
    student.name,
    ...student.statuses.map((v) => v || ''),
    student.summary.P,
    student.summary.A,
    student.summary.L,
    student.summary.E,
  ]
}

// ─── Public entry ────────────────────────────────────────────────────────
export async function exportAttendanceData(
  format: ExportFormat,
  payload: AttendanceExportPayload,
  signal?: { aborted: boolean },
): Promise<void> {
  if (signal?.aborted) return

  if (format === 'csv') {
    exportAttendanceCsv(payload)
    return
  }

  if (format === 'xlsx') {
    const XLSX = await import('xlsx-js-style')
    if (signal?.aborted) return
    exportAttendanceXlsxWithLib(payload, XLSX)
    return
  }

  if (format === 'pdf') {
    const { jsPDF } = await import('jspdf')
    const autoTableModule = await import('jspdf-autotable')
    const { ethiopicFontBase64 } = await import('./ethiopicFont')
    if (signal?.aborted) return
    exportAttendancePdfWithLibs(payload, jsPDF, autoTableModule, ethiopicFontBase64)
    return
  }
}

// ─── CSV (no external deps) ──────────────────────────────────────────────
function exportAttendanceCsv(payload: AttendanceExportPayload): void {
  const headers = buildHeaders(payload)
  const rows: Array<Array<string | number>> = [headers]
  for (const student of payload.students) {
    rows.push(buildRow(student))
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

  // UTF-8 BOM so Excel opens Amharic / Oromo names correctly
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = getAttendanceFileName(payload, 'csv')
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── XLSX ────────────────────────────────────────────────────────────────
function exportAttendanceXlsxWithLib(
  payload: AttendanceExportPayload,
  XLSX: typeof import('xlsx-js-style'),
): void {
  const sheetName = payload.semester === 1 ? 'Sem I' : 'Sem II'
  const headerFillRgb = exportTheme.headerFill.replace('#', '')
  const headerTextRgb = exportTheme.headerText.replace('#', '')
  const borderRgb = exportTheme.border.replace('#', '')
  const textRgb = exportTheme.text.replace('#', '')

  const headerStyle = {
    font: { bold: true, color: { rgb: headerTextRgb }, sz: 11 },
    fill: { fgColor: { rgb: headerFillRgb } },
    alignment: { horizontal: 'center', vertical: 'center' },
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
  const nameStyle = {
    ...dataStyle,
    alignment: { horizontal: 'left', vertical: 'center' },
  }

  const headers = buildHeaders(payload)
  const headerCells = headers.map((label) => ({ v: label, t: 's', s: headerStyle }))

  const dataCells = payload.students.map((student) => {
    const values = buildRow(student)
    return values.map((v, idx) => ({
      v,
      t: typeof v === 'number' ? 'n' : 's',
      s: idx === 1 ? nameStyle : dataStyle,
    }))
  })

  const ws = XLSX.utils.aoa_to_sheet([headerCells, ...dataCells]) as import('xlsx-js-style').WorkSheet

  // Column widths: NO narrow, Name wider, date / PALE columns narrow
  const cols = headers.map((h) => {
    if (h === 'Student Name') return { wch: 24 }
    if (h === 'NO') return { wch: 5 }
    if (h === 'P' || h === 'A' || h === 'L' || h === 'E') return { wch: 4 }
    return { wch: 11 }
  })
  ws['!cols'] = cols

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, getAttendanceFileName(payload, 'xlsx'))
}

// ─── PDF ─────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const normalized = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const value = Number.parseInt(normalized, 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function exportAttendancePdfWithLibs(
  payload: AttendanceExportPayload,
  jsPDF: typeof import('jspdf').jsPDF,
  autoTableModule: unknown,
  ethiopicFontBase64: string,
): void {
  type AutoTableFn = (doc: unknown, options: unknown) => void
  const mod = autoTableModule as { default?: AutoTableFn; autoTable?: AutoTableFn }
  const autoTable: AutoTableFn | undefined = mod.default ?? mod.autoTable
  if (!autoTable) throw new Error('PDF table plugin not available')

  const totalCols = 2 + payload.sessionHeaders.length + 4
  const orientation = totalCols <= 5 ? 'portrait' : 'landscape'
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation })

  doc.addFileToVFS('Ethiopic.ttf', ethiopicFontBase64)
  doc.addFont('Ethiopic.ttf', 'Ethiopic', 'normal')
  doc.addFont('Ethiopic.ttf', 'Ethiopic', 'bold')
  doc.setFont('Ethiopic')

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginLeft = 32
  const marginRight = 32
  const printableWidth = pageWidth - (marginLeft + marginRight)

  // Title
  doc.setFontSize(13)
  doc.setTextColor(...hexToRgb(exportTheme.text))
  const semLabel = payload.semester === 1 ? 'Sem I' : 'Sem II'
  const titleParts = [payload.schoolName, payload.className, 'Attendance', semLabel, payload.dateStr]
  doc.text(titleParts.filter(Boolean).join(' - '), marginLeft, 40)

  // Column widths scale from on-screen px to the printable width
  const naturalWidth = 48 + 150 + payload.sessionHeaders.length * 56 + 4 * 44
  const scale = printableWidth / naturalWidth
  const columnStyles: Record<number, { cellWidth: number; halign?: 'center' | 'left' }> = {
    0: { cellWidth: 48 * scale, halign: 'center' },
    1: { cellWidth: 150 * scale, halign: 'left' },
  }
  payload.sessionHeaders.forEach((_, idx) => {
    columnStyles[2 + idx] = { cellWidth: 56 * scale, halign: 'center' }
  })
  const summaryStart = 2 + payload.sessionHeaders.length
  for (let i = 0; i < 4; i += 1) {
    columnStyles[summaryStart + i] = { cellWidth: 44 * scale, halign: 'center' }
  }

  const head = [buildHeaders(payload)]
  const body = payload.students.map((s) =>
    buildRow(s).map((v) => (v === null || v === undefined ? '' : v)),
  )

  autoTable(doc, {
    head,
    body,
    startY: 60,
    margin: { left: marginLeft, right: marginRight },
    theme: 'plain', // no zebra stripes — spec §8 wants all-white data rows
    styles: {
      font: 'Ethiopic',
      fontSize: 9,
      textColor: hexToRgb(exportTheme.text),
      lineColor: hexToRgb(exportTheme.border),
      lineWidth: 0.4,
      halign: 'center',
      valign: 'middle',
      cellPadding: 3,
    },
    headStyles: {
      fillColor: hexToRgb(exportTheme.headerFill),
      textColor: hexToRgb(exportTheme.headerText),
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles,
  })

  // Page numbers after all pages are known
  const pageCount = doc.getNumberOfPages()
  doc.setFontSize(8)
  doc.setTextColor(...hexToRgb(exportTheme.text))
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginRight, pageHeight - 20, {
      align: 'right',
    })
  }

  doc.save(getAttendanceFileName(payload, 'pdf'))
}
