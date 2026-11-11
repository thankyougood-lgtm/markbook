import type { ExportPayload } from './types'
import { getExportFileName } from './fileName'
import { exportTheme } from './exportTheme'

export async function exportXlsx(payload: ExportPayload): Promise<void> {
  const XLSX = await import('xlsx-js-style')

  const sheetName = payload.semester === 1 ? 'Sem I' : 'Sem II'
  const headerFillRgb = exportTheme.headerFill.replace('#', '')
  const headerTextRgb = exportTheme.headerText.replace('#', '')
  const altRowRgb = exportTheme.alternateRowFill.replace('#', '')
  const borderRgb = exportTheme.border.replace('#', '')

  const headerStyle = {
    font: {
      bold: true,
      color: { rgb: headerTextRgb },
      sz: 11,
    },
    fill: {
      fgColor: { rgb: headerFillRgb },
    },
    alignment: {
      horizontal: 'center',
      vertical: 'center',
    },
    border: {
      top: { style: 'thin', color: { rgb: borderRgb } },
      bottom: { style: 'thin', color: { rgb: borderRgb } },
      left: { style: 'thin', color: { rgb: borderRgb } },
      right: { style: 'thin', color: { rgb: borderRgb } },
    },
  }

  // Row 1 header cells
  const dataRows: Array<Array<{ v: string | number; t: string; s?: unknown }>> = []
  const headerRow = payload.columns.map((col) => ({
    v: col.label,
    t: 's',
    s: headerStyle,
  }))
  dataRows.push(headerRow)

  // Data rows
  payload.rows.forEach((rowData, rowIndex) => {
    const isAlt = rowIndex % 2 === 1
    const cellStyle = {
      font: { sz: 10 },
      fill: isAlt ? { fgColor: { rgb: altRowRgb } } : undefined,
      alignment: { vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: borderRgb } },
        bottom: { style: 'thin', color: { rgb: borderRgb } },
        left: { style: 'thin', color: { rgb: borderRgb } },
        right: { style: 'thin', color: { rgb: borderRgb } },
      },
    }

    const rowCells: Array<{ v: string | number; t: string; s?: unknown }> = []
    for (const col of payload.columns) {
      if (col.kind === 'no') {
        rowCells.push({ v: rowData.serialNo, t: 'n', s: { ...cellStyle, alignment: { horizontal: 'center' } } })
      } else if (col.kind === 'name') {
        rowCells.push({ v: rowData.name, t: 's', s: { ...cellStyle, alignment: { horizontal: 'left' } } })
      } else if (col.kind === 'sex') {
        rowCells.push({ v: rowData.sex ?? '', t: 's', s: { ...cellStyle, alignment: { horizontal: 'center' } } })
      } else if (col.kind === 'age') {
        const hasAge = rowData.age !== '' && rowData.age !== null && rowData.age !== undefined
        rowCells.push({
          v: hasAge ? Number(rowData.age) : '',
          t: hasAge ? 'n' : 's',
          s: { ...cellStyle, alignment: { horizontal: 'center' } },
        })
      } else if (col.kind === 'total') {
        const hasTotal = rowData.total !== null && rowData.total !== undefined
        rowCells.push({
          v: hasTotal ? Number(rowData.total) : '',
          t: hasTotal ? 'n' : 's',
          s: { ...cellStyle, alignment: { horizontal: 'center' } },
        })
      } else if (col.kind === 'remark') {
        rowCells.push({ v: rowData.remark ?? '', t: 's', s: { ...cellStyle, alignment: { horizontal: 'left' } } })
      } else {
        const val = rowData.scores[col.id]
        if (typeof val === 'number') {
          rowCells.push({ v: val, t: 'n', s: { ...cellStyle, alignment: { horizontal: 'center' } } })
        } else if (typeof val === 'string' && val.trim() !== '') {
          rowCells.push({ v: val, t: 's', s: { ...cellStyle, alignment: { horizontal: 'center' } } })
        } else {
          // Blank score is empty cell, never 0
          rowCells.push({ v: '', t: 's', s: cellStyle })
        }
      }
    }
    dataRows.push(rowCells)
  })

  // Convert array of styled cells to worksheet
  const ws: Record<string, unknown> = {}
  dataRows.forEach((row, r) => {
    row.forEach((cell, c) => {
      const cellRef = XLSX.utils.encode_cell({ r, c })
      ws[cellRef] = cell
    })
  })
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: dataRows.length - 1, c: payload.columns.length - 1 },
  })

  // In Excel, column width (wch) represents the number of characters in standard font.
  // Since a character width is roughly 7 pixels at standard DPI and default spreadsheet font,
  // converting pixel widths to Excel wch requires dividing the pixel count by 7 (Math.round(px / 7)).
  ws['!cols'] = payload.columns.map((col) => ({
    wch: Math.round(col.widthPx / 7),
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws as never, sheetName)

  const fileName = getExportFileName(payload.className, payload.semester, 'xlsx')
  XLSX.writeFile(wb, fileName)
}

