import { describe, it, expect } from 'vitest'
import type {
  AttendanceRecordRow,
  AttendanceSessionRow,
  StudentRow,
  SubjectRow,
} from '../../../db/db'
import {
  computeOverview,
  computeSubjectAverages,
  computeScoreDistribution,
  computeAttendanceBreakdown,
  computeAttendanceTrend,
  computeSexSplit,
  computeStudentSummaries,
} from '../compute'

function mkStudent(id: number, name: string, sex: 'M' | 'F' | null = null): StudentRow {
  return { id, classId: 1, serialNo: id, fullName: name, sex, age: null, order: id }
}
function mkSubject(id: number, name: string, maxScore = 100): SubjectRow {
  return { id, classId: 1, name, maxScore, order: id, kind: 'score' }
}
function mkSession(id: number, date: string, period: number | null = null): AttendanceSessionRow {
  return { id, classId: 1, date, period, subjectId: null, archivedAt: null }
}
function mkRecord(sessionId: number, studentId: number, status: 'P' | 'A' | 'L' | 'E'): AttendanceRecordRow {
  return { sessionId, studentId, status }
}

describe('computeOverview', () => {
  it('counts active items only', () => {
    const students = [mkStudent(1, 'A'), { ...mkStudent(2, 'B'), archivedAt: 123 }]
    const subjects = [mkSubject(1, 'Math'), { ...mkSubject(2, 'Eng'), archivedAt: 123 }]
    const sessions = [mkSession(1, '2026-11-01'), { ...mkSession(2, '2026-11-02'), archivedAt: 123 }]
    expect(computeOverview(students, subjects, sessions)).toEqual({
      studentCount: 1,
      subjectCount: 1,
      sessionCount: 1,
    })
  })
})

describe('computeSubjectAverages', () => {
  it('ignores blanks and normalises by maxScore', () => {
    const students = [mkStudent(1, 'A'), mkStudent(2, 'B')]
    const subjects = [mkSubject(1, 'Math', 100), mkSubject(2, 'Quiz', 10)]
    const scores = {
      1: { 1: 80, 2: 5 },
      2: { 1: 40, 2: null },   // blank score
    }
    const result = computeSubjectAverages(scores, subjects, students)
    expect(result[0].averagePct).toBe(60)      // (80+40)/2/100 = 60%
    expect(result[0].count).toBe(2)
    expect(result[1].averagePct).toBe(50)      // only 5 entered, /10 = 50%
    expect(result[1].count).toBe(1)
  })

  it('returns null average when no scores entered', () => {
    const result = computeSubjectAverages({}, [mkSubject(1, 'Math')], [mkStudent(1, 'A')])
    expect(result[0].averagePct).toBeNull()
    expect(result[0].count).toBe(0)
  })

  it('excludes non-score kind subjects', () => {
    const students = [mkStudent(1, 'A')]
    const subjects: SubjectRow[] = [
      mkSubject(1, 'Math'),
      { id: 2, classId: 1, name: 'Attendance', maxScore: 100, order: 2, kind: 'dropdown' },
    ]
    const result = computeSubjectAverages({ 1: { 1: 50, 2: 'P' } }, subjects, students)
    expect(result).toHaveLength(1)
    expect(result[0].subjectId).toBe(1)
  })
})

describe('computeScoreDistribution', () => {
  it('buckets every entered score by percent of its subject max', () => {
    const students = [mkStudent(1, 'A')]
    const subjects = [mkSubject(1, 'Math', 100), mkSubject(2, 'Quiz', 10)]
    const scores = { 1: { 1: 90, 2: 9 } }  // 90% and 90%
    const buckets = computeScoreDistribution(scores, subjects, students)
    expect(buckets[4].count).toBe(2)         // 80–100 bucket
    expect(buckets.reduce((s, b) => s + b.count, 0)).toBe(2)
  })
})

describe('computeAttendanceBreakdown', () => {
  it('sums statuses for active sessions and students only', () => {
    const students = [mkStudent(1, 'A'), mkStudent(2, 'B')]
    const sessions = [mkSession(10, '2026-11-01')]
    const records = [
      mkRecord(10, 1, 'P'),
      mkRecord(10, 2, 'A'),
      mkRecord(11, 1, 'P'), // session 11 not in active sessions — ignored
    ]
    const b = computeAttendanceBreakdown(records, sessions, students)
    expect(b).toEqual({ P: 1, A: 1, L: 0, E: 0, total: 2 })
  })
})

describe('computeAttendanceTrend', () => {
  it('returns sorted per-session attendance %, null when no records', () => {
    const students = [mkStudent(1, 'A'), mkStudent(2, 'B')]
    const sessions = [mkSession(1, '2026-11-02'), mkSession(2, '2026-11-01')]
    const records = [mkRecord(1, 1, 'P'), mkRecord(1, 2, 'A')]
    const trend = computeAttendanceTrend(records, sessions, students)
    expect(trend.map((p) => p.sessionId)).toEqual([2, 1])  // sorted by date
    expect(trend[0].attendancePct).toBeNull()              // no records
    expect(trend[1].attendancePct).toBe(50)                // 1 of 2 present
    expect(trend[1].attended).toBe(1)
    expect(trend[1].taken).toBe(2)
  })
})

describe('computeSexSplit', () => {
  it('counts M, F and blank, ignoring archived', () => {
    const students = [
      mkStudent(1, 'A', 'M'),
      mkStudent(2, 'B', 'F'),
      mkStudent(3, 'C', null),
      { ...mkStudent(4, 'D', 'M'), archivedAt: 1 },
    ]
    expect(computeSexSplit(students)).toEqual({ M: 1, F: 1, blank: 1 })
  })
})

describe('computeStudentSummaries', () => {
  it('averages only entered scores and computes attendance % correctly', () => {
    const students = [mkStudent(1, 'A'), mkStudent(2, 'B')]
    const subjects = [mkSubject(1, 'Math', 100), mkSubject(2, 'Quiz', 50)]
    const sessions = [mkSession(10, '2026-11-01'), mkSession(11, '2026-11-02')]
    const scores = {
      1: { 1: 80, 2: 40 },   // 80% + 80% = 80% avg
      2: { 1: 30 },          // only Math entered: 30%
    }
    const records = [
      mkRecord(10, 1, 'P'), mkRecord(11, 1, 'P'),
      mkRecord(10, 2, 'A'), mkRecord(11, 2, 'L'),
    ]
    const summaries = computeStudentSummaries(scores, subjects, students, records, sessions)
    expect(summaries[0].average).toBe(80)
    expect(summaries[0].attendancePct).toBe(100)
    expect(summaries[1].average).toBe(30)   // only 30/100 counted, Quiz max excluded
    expect(summaries[1].attendancePct).toBe(0)
  })

  it('returns null avg for a student with no entered scores', () => {
    const students = [mkStudent(1, 'A')]
    const subjects = [mkSubject(1, 'Math')]
    const summaries = computeStudentSummaries({}, subjects, students, [], [])
    expect(summaries[0].average).toBeNull()
    expect(summaries[0].attendancePct).toBeNull()
  })
})
