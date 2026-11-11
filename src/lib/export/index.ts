import { exportData } from '../../export'
import type { ExportFormat, ExportPayload, ExportColumn, ExportStudentRow } from '../../export/types'

export type { ExportFormat }

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
  const header = [
    'NO',
    'Student name',
    'Sex',
    'Age',
    ...input.subjects.map((subject) => `${subject.name} /${subject.maxScore}`),
    'Total',
    'Remark',
  ]
  const rows: Array<Array<string | number | null>> = [header]

  const students = [...input.students].sort((left, right) => (left.id ?? 0) - (right.id ?? 0))

  for (const [index, student] of students.entries()) {
    const studentId = student.id ?? -1
    const scoreRow = input.scores[studentId] ?? {}
    const hasAnyScore = scoreSubjects.some((subject) => typeof scoreRow[subject.id] === 'number')
    const total = hasAnyScore
      ? scoreSubjects.reduce((sum, subject) => {
          const value = scoreRow[subject.id]
          return typeof value === 'number' ? sum + value : sum
        }, 0)
      : null

    const row: Array<string | number | null> = [
      index + 1,
      student.fullName ?? '',
      student.sex ?? '',
      student.age != null ? student.age : '',
      ...input.subjects.map((subject) => {
        const value = scoreRow[subject.id]
        if (value === null || value === undefined) {
          return ''
        }
        return value
      }),
      total != null ? total : '',
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

export async function exportGradebook(
  format: ExportFormat,
  input: GradebookExportInput,
  _baseName?: string,
  signal?: { aborted: boolean },
) {
  const columns: ExportColumn[] = [
    { id: 'no', label: 'NO', widthPx: 48, kind: 'no' },
    { id: 'name', label: 'Students name', widthPx: 180, kind: 'name' },
    { id: 'sex', label: 'Sex', widthPx: 72, kind: 'sex' },
    { id: 'age', label: 'Age', widthPx: 72, kind: 'age' },
    ...input.subjects.map((s) => ({
      id: String(s.id),
      label: s.kind === 'score' || !s.kind ? `${s.name} /${s.maxScore}` : s.name,
      widthPx: 100,
      kind: (s.kind === 'score' || !s.kind ? 'score' : 'extra') as 'score' | 'extra',
      maxScore: s.maxScore,
    })),
    { id: 'total', label: 'Total', widthPx: 120, kind: 'total' },
    { id: 'remark', label: 'Remark', widthPx: 160, kind: 'remark' },
  ]

  const rows: ExportStudentRow[] = input.students.map((student, idx) => {
    const sId = student.id ?? idx + 1
    const scoreMap = input.scores[sId] ?? {}
    const colScores: Record<string, number | string | null> = {}
    let sum = 0
    let hasScore = false

    input.subjects.forEach((sub) => {
      const val = scoreMap[sub.id]
      colScores[String(sub.id)] = val !== undefined ? val : null
      if (typeof val === 'number' && (sub.kind ?? 'score') === 'score') {
        sum += val
        hasScore = true
      }
    })

    return {
      studentId: sId,
      serialNo: idx + 1,
      name: student.fullName,
      sex: student.sex ?? '',
      age: student.age != null ? student.age : '',
      scores: colScores,
      total: hasScore ? sum : null,
      remark: input.remarks[sId] ?? '',
    }
  })

  const payload: ExportPayload = {
    schoolName: input.schoolName,
    className: input.className,
    semester: (input.semester === 2 ? 2 : 1) as 1 | 2,
    academicYear: input.academicYear,
    columns,
    rows,
  }

  await exportData(format, payload, signal)
}
