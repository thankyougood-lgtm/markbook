import type { RosterModel } from './buildRoster'
import { ROSTER_LABELS, SEM_LABELS } from './labels'

export interface RosterXlsxInput {
  model: RosterModel
  schoolName: string
  className: string
  academicYear: string
}

export async function writeRosterXlsx(input: RosterXlsxInput): Promise<Uint8Array> {
  const XLSX = await import('xlsx-js-style')
  const { model, schoolName, className, academicYear } = input

  const title = `${schoolName} roster for ${className} academic year ${academicYear}`

  // 1. Build Headers Array
  const headers = [
    ROSTER_LABELS.NO,
    ROSTER_LABELS.NAME,
    ROSTER_LABELS.SEX,
    ROSTER_LABELS.AGE,
    ROSTER_LABELS.SEMESTER,
    ...model.subjects,
    ROSTER_LABELS.TOTAL,
    ROSTER_LABELS.AVERAGE,
    ROSTER_LABELS.RANK,
    ROSTER_LABELS.CONDUCT,
    ROSTER_LABELS.ABSENTS,
    ROSTER_LABELS.REMARK,
  ]

  // 2. Common Styles
  const borderStyle = { style: 'thin', color: { rgb: '000000' } }
  const borders = {
    top: borderStyle,
    bottom: borderStyle,
    left: borderStyle,
    right: borderStyle,
  }

  const baseStyle = {
    font: { name: 'Times New Roman', sz: 11, color: { rgb: '000000' } },
    border: borders,
    alignment: { vertical: 'bottom', horizontal: 'center' },
  }

  const textStyle = {
    ...baseStyle,
    alignment: { vertical: 'bottom', horizontal: 'left' },
  }

  const boldStyle = {
    ...baseStyle,
    font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: '000000' } },
  }


  const headerStyle = {
    font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: '000000' } },
    border: borders,
    alignment: { textRotation: 90, vertical: 'bottom', horizontal: 'center' },
  }

  const titleStyle = {
    font: { name: 'Times New Roman', sz: 11, color: { rgb: '000000' } },
    alignment: { vertical: 'center', horizontal: 'left' },
  }

  // 3. Build Data Matrix (Array of Arrays)
  const wsData: any[][] = []

  // Title Row
  const titleRow = new Array(headers.length).fill(null)
  titleRow[0] = { v: title, t: 's', s: titleStyle }
  wsData.push(titleRow)

  // Header Row
  const headerRow = headers.map((h) => {
    if (h === ROSTER_LABELS.NAME) {
      return {
        v: h,
        t: 's',
        s: { ...headerStyle, alignment: { textRotation: 0, vertical: 'bottom', horizontal: 'left' } },
      }
    }
    return { v: h, t: 's', s: headerStyle }
  })
  wsData.push(headerRow)

  // Data Rows (3 per student)
  for (const student of model.students) {
    for (let rIndex = 0; rIndex < 3; rIndex++) {
      const row = student.rows[rIndex]
      const isAV = row.semester === 'AV'

      const dataRow: any[] = []

      // Col 0: NO (only put value on the first row, visually it's merged)
      dataRow.push({
        v: rIndex === 0 ? student.no : null,
        t: 'n',
        s: { ...baseStyle, font: { ...baseStyle.font, bold: false } }, // NO is not bold
      })

      // Col 1: Students name
      dataRow.push({
        v: rIndex === 0 ? student.name : null,
        t: 's',
        s: { ...textStyle, font: { ...textStyle.font, bold: true } }, // Name is bold
      })

      // Col 2: Sex
      dataRow.push({ v: rIndex === 0 ? student.sex : null, t: 's', s: baseStyle })

      // Col 3: Age
      dataRow.push({ v: rIndex === 0 ? student.age : null, t: 's', s: baseStyle })

      // Col 4: Semester Label (I, II, AV)
      dataRow.push({
        v: SEM_LABELS[row.semester],
        t: 's',
        s: isAV ? boldStyle : baseStyle,
      })

      // Subject Columns
      for (const sub of model.subjects) {
        const val = row.subjectValues[sub]
        dataRow.push({
          v: val === null ? null : val,
          t: val === null ? 'z' : 'n',
          s: isAV ? boldStyle : baseStyle,
        })
      }

      // Totals, Avg, Rank (Bold on AV row)
      const rowStyle = isAV ? boldStyle : baseStyle
      dataRow.push({ v: row.total ?? null, t: row.total === null ? 'z' : 'n', s: rowStyle })
      dataRow.push({ v: row.average ?? null, t: row.average === null ? 'z' : 'n', s: rowStyle })
      dataRow.push({ v: row.rank ?? null, t: row.rank === null ? 'z' : 'n', s: rowStyle })

      // Conduct, Absents, Remark
      dataRow.push({ v: row.conduct || null, t: 's', s: rowStyle })
      dataRow.push({ v: row.absents ?? null, t: row.absents === null ? 'z' : 'n', s: rowStyle })
      dataRow.push({ v: row.remark || null, t: 's', s: rowStyle })

      wsData.push(dataRow)
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // 4. Merges
  const merges: any[] = []
  
  // Merge the title row across all columns
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } })

  // Merge NO, Name, Sex, Age for each student block
  for (let i = 0; i < model.students.length; i++) {
    const startRow = 2 + i * 3 // 0-indexed rows (0=title, 1=header)
    const endRow = startRow + 2 // spans 3 rows
    merges.push({ s: { r: startRow, c: 0 }, e: { r: endRow, c: 0 } })
    merges.push({ s: { r: startRow, c: 1 }, e: { r: endRow, c: 1 } })
    merges.push({ s: { r: startRow, c: 2 }, e: { r: endRow, c: 2 } })
    merges.push({ s: { r: startRow, c: 3 }, e: { r: endRow, c: 3 } })
  }
  ws['!merges'] = merges

  // 5. Dimensions and Layout
  ws['!cols'] = [
    { wch: 5 },  // NO
    { wch: 30 }, // Name
    { wch: 5 },  // Sex
    { wch: 5 },  // Age
    { wch: 9 },  // Semester
    ...model.subjects.map(() => ({ wch: 8 })), // Subjects
    { wch: 8 },  // Total
    { wch: 9 },  // Avg
    { wch: 6 },  // Rank
    { wch: 9 },  // Conduct
    { wch: 9 },  // Absents
    { wch: 14 }, // Remark
  ]

  // Row heights
  const rows: any[] = []
  rows[0] = { hpt: 20 } // Title row
  rows[1] = { hpt: 100 } // Header row (tall to fit rotated text)
  for (let i = 2; i < wsData.length; i++) {
    rows[i] = { hpt: 15 } // Data rows
  }
  ws['!rows'] = rows

  // 6. Workbook Setup
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Roster')

  // Page setup (portrait, A4, fit to 1 page wide)
  ;(wb as any).Workbook = {
    Views: [{ RTL: false }],
    Sheets: [
      {
        name: 'Roster',
        Hidden: 0,
        PageSetup: {
          Orientation: 'portrait',
          PaperSize: 9, // A4
          FitToWidth: 1,
          FitToHeight: 0, // As many pages tall as needed
          Margin: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
        }
      }
    ]
  }

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Uint8Array(buffer)
}
