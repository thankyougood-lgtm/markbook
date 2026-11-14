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

export async function writeRosterXlsx(input: RosterXlsxInput): Promise<Uint8Array> {
  const XLSX = await import('xlsx-js-style')
  const { model, schoolName, grade, section, academicYear } = input

  // E4: Title uses grade and section fields
  const title = `${schoolName} roster for grade ${grade} sec "${section}"  academic year ${academicYear}`

  // Build headers. Force string conversion to prevent [object Object]
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

  const borderStyle = { style: 'thin', color: { rgb: '000000' } }
  const borders = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle }

  const baseStyle = {
    font: { name: 'Times New Roman', sz: 11, color: { rgb: '000000' } },
    border: borders,
    alignment: { vertical: 'bottom', horizontal: 'center' },
  }
  const textStyle = { ...baseStyle, alignment: { vertical: 'bottom', horizontal: 'left' } }
  const boldStyle = { ...baseStyle, font: { ...baseStyle.font, bold: true } }
  const boldTextStyle = { ...textStyle, font: { ...textStyle.font, bold: true } }

  const headerStyle = {
    font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: '000000' } },
    border: borders,
    alignment: { textRotation: 90, vertical: 'bottom', horizontal: 'center' },
  }
  const titleStyle = {
    font: { name: 'Times New Roman', sz: 11, color: { rgb: '000000' } },
    alignment: { vertical: 'center', horizontal: 'left' },
    border: borders,
  }

  const wsData: any[][] = []

  // Row 1: Title (Merged, but still write to every coordinate to get borders)
  const titleRow: any[] = [{ v: title, t: 's', s: titleStyle }]
  for (let i = 1; i < headers.length; i++) {
    titleRow.push({ v: '', t: 's', s: titleStyle })
  }
  wsData.push(titleRow)

  // Row 2: Headers
  const headerRow = headers.map((h) => {
    if (h === ROSTER_LABELS.NAME) {
      return { v: h, t: 's', s: { ...headerStyle, alignment: { textRotation: 0, vertical: 'bottom', horizontal: 'left' } } }
    }
    return { v: h, t: 's', s: headerStyle }
  })
  wsData.push(headerRow)

  // Data: 3 rows per student
  for (const student of model.students) {
    for (let rIndex = 0; rIndex < 3; rIndex++) {
      const row = student.rows[rIndex]
      const isAV = row.semester === 'AV'
      const dataRow: any[] = []

      // NO, Name, Sex, Age (only value on rIndex 0, but write to every cell for borders)
      dataRow.push({ v: rIndex === 0 ? student.no : '', t: rIndex === 0 ? 'n' : 's', s: baseStyle })
      dataRow.push({ v: rIndex === 0 ? student.name : '', t: 's', s: boldTextStyle })
      dataRow.push({ v: rIndex === 0 ? student.sex : '', t: 's', s: baseStyle })
      dataRow.push({ v: rIndex === 0 ? student.age : '', t: 's', s: baseStyle })

      // Semester label
      dataRow.push({ v: SEM_LABELS[row.semester], t: 's', s: isAV ? boldStyle : baseStyle })

      // Subject Columns
      for (const sub of model.subjects) {
        const val = row.subjectValues[sub.key]
        dataRow.push({
          v: val === null || val === undefined ? '' : val,
          t: val === null || val === undefined ? 's' : 'n',
          s: isAV ? boldStyle : baseStyle,
        })
      }

      // Total, Average, Rank
      const rowStyle = isAV ? boldStyle : baseStyle
      dataRow.push({ v: row.total ?? '', t: row.total === null ? 's' : 'n', s: rowStyle })
      dataRow.push({ v: row.average ?? '', t: row.average === null ? 's' : 'n', s: rowStyle })
      dataRow.push({ v: row.rank ?? '', t: row.rank === null ? 's' : 'n', s: rowStyle })

      // Conduct, Absents, Remark
      dataRow.push({ v: row.conduct ?? '', t: 's', s: rowStyle })
      dataRow.push({ v: row.absents ?? '', t: row.absents === null ? 's' : 'n', s: rowStyle })
      dataRow.push({ v: row.remark ?? '', t: 's', s: rowStyle })

      wsData.push(dataRow)
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Merge NO, Name, Sex, Age across the 3 rows
  const merges: any[] = []
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }) // title
  for (let i = 0; i < model.students.length; i++) {
    const startRow = 2 + i * 3
    const endRow = startRow + 2
    merges.push({ s: { r: startRow, c: 0 }, e: { r: endRow, c: 0 } }) // NO
    merges.push({ s: { r: startRow, c: 1 }, e: { r: endRow, c: 1 } }) // Name
    merges.push({ s: { r: startRow, c: 2 }, e: { r: endRow, c: 2 } }) // Sex
    merges.push({ s: { r: startRow, c: 3 }, e: { r: endRow, c: 3 } }) // Age
  }
  ws['!merges'] = merges

  // Column widths
  ws['!cols'] = [
    { wch: 5 }, { wch: 30 }, { wch: 5 }, { wch: 5 }, { wch: 9 },
    ...model.subjects.map(() => ({ wch: 8 })),
    { wch: 8 }, { wch: 9 }, { wch: 6 }, { wch: 9 }, { wch: 9 }, { wch: 14 },
  ]

  // Row heights
  const rows: any[] = []
  rows[0] = { hpt: 20 } // Title
  rows[1] = { hpt: 100 } // Header
  for (let i = 2; i < wsData.length; i++) {
    rows[i] = { hpt: 15 }
  }
  ws['!rows'] = rows

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Roster')

  // Print setup (Basic, the JSZip patch would go deeper here for Print Areas)
  ;(wb as any).Workbook = {
    Views: [{ RTL: false }],
    Sheets: [
      {
        name: 'Roster', Hidden: 0,
        PageSetup: {
          Orientation: headers.length <= 14 ? 'portrait' : 'landscape',
          PaperSize: 9, // A4
          FitToWidth: 1,
          FitToHeight: 0,
          Margin: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 },
          CenterHorizontally: true,
        }
      }
    ]
  }

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Uint8Array(buffer)
}
