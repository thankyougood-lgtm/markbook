import type { ExportPayload } from './types'
import { getExportFileName } from './fileName'
import { exportTheme } from './exportTheme'

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const normalized = clean.length === 3 ? clean.split('').map((char) => char + char).join('') : clean
  const value = Number.parseInt(normalized, 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

export async function exportPdf(payload: ExportPayload): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTableModule = await import('jspdf-autotable')
  const autoTable =
    (autoTableModule as { default?: (doc: InstanceType<typeof jsPDF>, options: unknown) => void; autoTable?: (doc: InstanceType<typeof jsPDF>, options: unknown) => void }).default ??
    (autoTableModule as { default?: (doc: InstanceType<typeof jsPDF>, options: unknown) => void; autoTable?: (doc: InstanceType<typeof jsPDF>, options: unknown) => void }).autoTable

  if (!autoTable) {
    throw new Error('PDF table plugin not available')
  }

  const { ethiopicFontBase64 } = await import('./ethiopicFont')

  const orientation = payload.columns.length <= 5 ? 'portrait' : 'landscape'
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation })

  // Register bundled Ethiopic font so Amharic and Oromo text print correctly
  doc.addFileToVFS('Ethiopic.ttf', ethiopicFontBase64)
  doc.addFont('Ethiopic.ttf', 'Ethiopic', 'normal')
  doc.addFont('Ethiopic.ttf', 'Ethiopic', 'bold')
  doc.setFont('Ethiopic')

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginLeft = 32
  const marginRight = 32
  const printableWidth = pageWidth - (marginLeft + marginRight)

  const semLabel = payload.semester === 1 ? 'Sem I' : 'Sem II'
  const dateStr = payload.dateStr || new Date().toISOString().slice(0, 10)
  const title = payload.schoolName
    ? `${payload.schoolName} - ${payload.className} - ${semLabel} - ${dateStr}`
    : `${payload.className} - ${semLabel} - ${dateStr}`

  // Title on first page
  const headerTextColor = hexToRgb(exportTheme.text)
  doc.setFont('Ethiopic', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2])
  doc.text(title, marginLeft, 32)

  const header = payload.columns.map((c) => c.label)
  const body: Array<Array<string | number>> = []

  for (const rowData of payload.rows) {
    const rowCells: Array<string | number> = []
    for (const col of payload.columns) {
      if (col.kind === 'no') {
        rowCells.push(rowData.serialNo)
      } else if (col.kind === 'name') {
        rowCells.push(rowData.name)
      } else if (col.kind === 'sex') {
        rowCells.push(rowData.sex ?? '')
      } else if (col.kind === 'age') {
        rowCells.push(rowData.age !== null && rowData.age !== undefined ? rowData.age : '')
      } else if (col.kind === 'total') {
        rowCells.push(rowData.total !== null && rowData.total !== undefined ? rowData.total : '')
      } else if (col.kind === 'remark') {
        rowCells.push(rowData.remark ?? '')
      } else {
        const val = rowData.scores[col.id]
        rowCells.push(val !== null && val !== undefined ? val : '')
      }
    }
    body.push(rowCells)
  }

  const totalPx = payload.columns.reduce((sum, col) => sum + col.widthPx, 0)

  // The sum of column pixel widths from the responsive screen may differ from printable page width.
  // We compute a scaling factor (available printable width divided by total pixel width of all columns)
  // and scale each column's cell width proportionally so all columns fit cleanly without clipping.
  const scaleFactor = printableWidth / Math.max(totalPx, 1)
  const columnStyles: Record<number, { cellWidth: number; halign?: 'left' | 'center' }> = {}
  payload.columns.forEach((col, idx) => {
    columnStyles[idx] = {
      cellWidth: col.widthPx * scaleFactor,
      halign: col.kind === 'name' || col.kind === 'remark' ? 'left' : 'center',
    }
  })

  const headerFill = hexToRgb(exportTheme.headerFill)
  const whiteText = hexToRgb(exportTheme.headerText)
  const alternateFill = hexToRgb(exportTheme.alternateRowFill)
  const borderColor = hexToRgb(exportTheme.border)

  autoTable(doc, {
    head: [header],
    body,
    startY: 46,
    margin: { left: marginLeft, right: marginRight, top: 46, bottom: 36 },
    showHead: 'everyPage',
    theme: 'grid',
    styles: {
      font: 'Ethiopic',
      fontSize: 8,
      cellPadding: 4,
      textColor: headerTextColor,
      lineColor: borderColor,
      lineWidth: 0.5,
      valign: 'middle',
    },
    headStyles: {
      font: 'Ethiopic',
      fontStyle: 'bold',
      fillColor: headerFill,
      textColor: whiteText,
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: alternateFill,
    },
    columnStyles,
  })

  // Page X of Y footer at the bottom of each page
  const totalPages = doc.getNumberOfPages()
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum)
    doc.setFont('Ethiopic', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2])
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 16, { align: 'center' })
  }

  const fileName = getExportFileName(payload.className, payload.semester, 'pdf')
  doc.save(fileName)
}

