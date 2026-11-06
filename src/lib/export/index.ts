import { exportTheme } from '../../export/exportTheme'

export type ExportFormat = 'csv' | 'xlsx' | 'pdf'

export type ExportSubject = {
  id: number
  name: string
  maxScore: number
  kind?: 'score' | 'text' | 'number' | 'dropdown'
}

export type ExportStudent = {
  id?: number
  fullName: string
  sex?: 'M' | 'F' | null
  age?: number | null
}

export type GradebookExportInput = {
  className: string
  schoolName?: string
  academicYear?: string
  semester: number
  students: ExportStudent[]
  subjects: ExportSubject[]
  scores: Record<number, Record<number, number | string | null>>
  remarks: Record<number, string | null>
}

export function buildGradebookRows(input: GradebookExportInput): Array<Array<string | number | null>> {
  const scoreSubjects = input.subjects.filter((subject) => (subject.kind ?? 'score') === 'score')
  const header = ['NO', 'Student name', 'Sex', 'Age', ...input.subjects.map((subject) => `${subject.name} /${subject.maxScore}`), 'Total', 'Remark']
  const rows: Array<Array<string | number | null>> = [header]

  const students = [...input.students].sort((left, right) => (left.id ?? 0) - (right.id ?? 0))

  for (const [index, student] of students.entries()) {
    const studentId = student.id ?? -1
    const scoreRow = input.scores[studentId] ?? {}
    const total = scoreSubjects.reduce((sum, subject) => {
      const value = scoreRow[subject.id]
      return typeof value === 'number' ? sum + value : sum
    }, 0)

    const row: Array<string | number | null> = [
      index + 1,
      student.fullName ?? '',
      student.sex ?? '',
      student.age ?? '',
      ...input.subjects.map((subject) => {
        const value = scoreRow[subject.id]
        if (value === null || value === undefined) {
          return ''
        }
        return value
      }),
      total || '',
      input.remarks[studentId] ?? '',
    ]

    rows.push(row)
  }

  return rows
}

export function toCsv(rows: Array<Array<string | number | null>>): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cell == null ? '' : String(cell)
          if (/[",\n]/.test(text)) {
            return `"${text.replace(/"/g, '""')}"`
          }
          return text
        })
        .join(','),
    )
    .join('\n')
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const normalized = clean.length === 3 ? clean.split('').map((char) => char + char).join('') : clean
  const value = Number.parseInt(normalized, 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

function toPdfColor(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  return [r, g, b]
}

function downloadBlob(blob: Blob, fileName: string) {
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

export async function exportGradebook(format: ExportFormat, input: GradebookExportInput, baseName: string) {
  const rows = buildGradebookRows(input)
  const fileStem = baseName.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]+/g, '') || 'markbook'
  const fileBase = `${fileStem}-sem-${input.semester}`

  if (format === 'csv') {
    const csv = toCsv(rows)
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${fileBase}.csv`)
    return
  }

  if (format === 'xlsx') {
    const XLSX = await import('xlsx-js-style')
    const worksheet = XLSX.utils.aoa_to_sheet(rows)
    worksheet['!cols'] = rows[0].map((_, index) => ({
      wpx: index === 0 ? 52 : index === 1 ? 180 : index === 2 ? 80 : index === 3 ? 80 : index === rows[0].length - 1 ? 180 : 120,
    }))

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    XLSX.writeFile(workbook, `${fileBase}.xlsx`)
    return
  }

  const { jsPDF } = await import('jspdf')
  const autoTableModule = await import('jspdf-autotable')
  const autoTable = (autoTableModule as { default?: (doc: InstanceType<typeof jsPDF>, options: unknown) => void; autoTable?: (doc: InstanceType<typeof jsPDF>, options: unknown) => void }).default ?? (autoTableModule as { default?: (doc: InstanceType<typeof jsPDF>, options: unknown) => void; autoTable?: (doc: InstanceType<typeof jsPDF>, options: unknown) => void }).autoTable

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const header = rows[0]
  const body = rows.slice(1).map((row) => row.map((cell) => (cell === null || cell === undefined || cell === '' ? '' : String(cell))))
  const textColor = toPdfColor(exportTheme.text) as [number, number, number]
  const borderColor = toPdfColor(exportTheme.border) as [number, number, number]
  const headerFill = toPdfColor(exportTheme.headerFill) as [number, number, number]
  const headerTextColor = toPdfColor(exportTheme.headerText) as [number, number, number]
  const alternateFill = toPdfColor(exportTheme.alternateRowFill) as [number, number, number]

  doc.setFontSize(14)
  const [textR, textG, textB] = textColor
  doc.setTextColor(textR, textG, textB)
  doc.text(`${input.className} · ${input.academicYear || ''} · Sem ${input.semester}`.trim().replace(/\s+·\s+$/, ''), 40, 42)

  if (!autoTable) {
    throw new Error('PDF table plugin not available')
  }

  autoTable(doc, {
    head: [header.map((cell) => String(cell))],
    body,
    startY: 60,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 6, textColor, lineColor: borderColor },
    headStyles: {
      fillColor: headerFill,
      textColor: headerTextColor,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: alternateFill,
    },
  })

  doc.save(`${fileBase}.pdf`)
}
