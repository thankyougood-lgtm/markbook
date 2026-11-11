import type { ExportPayload } from './types'
import { getExportFileName } from './fileName'

export function generateCsvString(payload: ExportPayload): string {
  const headers = payload.columns.map((c) => c.label)
  const rows: Array<Array<string | number>> = [headers]

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
    rows.push(rowCells)
  }

  return rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cell === null || cell === undefined ? '' : String(cell)
          if (/[",\n\r]/.test(text)) {
            return `"${text.replace(/"/g, '""')}"`
          }
          return text
        })
        .join(','),
    )
    .join('\r\n')
}

export function exportCsv(payload: ExportPayload): void {
  const csv = generateCsvString(payload)
  // UTF-8 with BOM so Excel opens Amharic correctly
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const fileName = getExportFileName(payload.className, payload.semester, 'csv')

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

