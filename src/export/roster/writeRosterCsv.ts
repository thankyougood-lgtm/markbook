import type { RosterModel } from './buildRoster'
import { ROSTER_LABELS, SEM_LABELS } from './labels'

export interface RosterCsvInput {
  model: RosterModel
  className: string
}

function esc(val: unknown): string {
  if (val === null || val === undefined) return ''
  let str = String(val)
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`
  }
  // Protect against CSV injection
  if (typeof val === 'string' && /^[=+\-@]/.test(str)) {
    str = `'${str}`
  }
  return str
}

export function writeRosterCsv(input: RosterCsvInput): string {
  const { model } = input
  
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

  const rows: string[] = []
  rows.push(headers.map(esc).join(','))

  for (const student of model.students) {
    for (const row of student.rows) {
      const csvRow = [
        student.no,
        student.name,
        student.sex,
        student.age,
        SEM_LABELS[row.semester],
        ...model.subjects.map(sub => row.subjectValues[sub]),
        row.total,
        row.average,
        row.rank,
        row.conduct,
        row.absents,
        row.remark,
      ]
      rows.push(csvRow.map(esc).join(','))
    }
  }

  // UTF-8 BOM + CRLF
  return '\uFEFF' + rows.join('\r\n')
}
