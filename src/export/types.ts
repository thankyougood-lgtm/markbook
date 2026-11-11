export type ExportFormat = 'xlsx' | 'csv' | 'pdf'

export interface ExportColumn {
  id: string
  label: string
  widthPx: number
  kind: 'no' | 'name' | 'sex' | 'age' | 'score' | 'extra' | 'total' | 'remark'
  maxScore?: number
}

export interface ExportStudentRow {
  studentId: number
  serialNo: number
  name: string
  sex: string
  age: number | string
  scores: Record<string, number | string | null>
  total: number | null
  remark: string
}

export interface ExportPayload {
  schoolName?: string
  className: string
  semester: 1 | 2
  academicYear?: string
  dateStr?: string
  columns: ExportColumn[]
  rows: ExportStudentRow[]
}

