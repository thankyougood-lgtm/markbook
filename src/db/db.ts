import Dexie, { type Table } from 'dexie'

export type Semester = 1 | 2
export type ScoreKind = 'score' | 'text' | 'number' | 'dropdown'
export type ScoreValue = number | string | null

export interface MarkBookClass {
  id?: number
  name: string
  grade: number
  section: string
  academicYear: string
  schoolName?: string
  teacherName?: string
  createdAt: number
  archivedAt?: number | null
  openSemesters: number[]
}

export interface SubjectRow {
  id?: number
  classId: number
  name: string
  maxScore: number
  order: number
  archivedAt?: number | null
  kind?: ScoreKind
  options?: string[]
}

export interface StudentRow {
  id?: number
  classId: number
  serialNo: number
  fullName: string
  sex?: 'M' | 'F' | null
  age?: number | null
  order: number
  archivedAt?: number | null
}

export interface StudentSemesterRow {
  studentId: number
  semester: Semester
  remark?: string | null
  conduct?: string | null
}

export interface ScoreRow {
  studentId: number
  semester: Semester
  subjectId: number
  value: ScoreValue
}

export interface AttendanceSessionRow {
  id?: number
  classId: number
  date: string
  period: number | null
  subjectId: number | null
  archivedAt?: number | null
}

export interface AttendanceRecordRow {
  sessionId: number
  studentId: number
  status: 'P' | 'A' | 'L' | 'E'
}

export interface SettingRow {
  key: string
  value: string | number | boolean | Record<string, unknown> | null
}

class MarkBookDatabase extends Dexie {
  classes!: Table<MarkBookClass, number>
  subjects!: Table<SubjectRow, number>
  students!: Table<StudentRow, number>
  studentSemesters!: Table<StudentSemesterRow, [number, number]>
  scores!: Table<ScoreRow, [number, number, number]>
  attendanceSessions!: Table<AttendanceSessionRow, number>
  attendanceRecords!: Table<AttendanceRecordRow, [number, number]>
  settings!: Table<SettingRow, string>

  constructor() {
    super('markbook')
    
    // SINGLE VERSION - CLEAN SLATE
    this.version(10).stores({
      classes: '++id, name, grade, section, academicYear, createdAt, archivedAt',
      subjects: '++id, classId, name, order, archivedAt',
      students: '++id, classId, order, archivedAt',
      studentSemesters: '[studentId+semester], semester',
      scores: '[studentId+semester+subjectId], semester, subjectId',
      attendanceSessions: '++id, classId, date, archivedAt',
      attendanceRecords: '[sessionId+studentId], sessionId',
      settings: '&key',
    })
  }
}

export const db = new MarkBookDatabase()

export function normalizeSemesters(value?: number[] | null): number[] {
  return Array.from(
    new Set((value ?? []).map((semester) => Number(semester)).filter((semester) => semester === 1 || semester === 2)),
  ).sort((a, b) => a - b)
}
