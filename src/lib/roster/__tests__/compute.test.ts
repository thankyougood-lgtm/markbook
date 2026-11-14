import { describe, it, expect } from 'vitest'
import type { StudentRow } from '../../../db/db'
import { computeRosterRows, type RosterSubject } from '../compute'

function mkStudent(id: number, name: string, sex: 'M' | 'F' | null = null): StudentRow {
  return { id, classId: 1, serialNo: id, fullName: name, sex, age: null, order: id }
}

const subjects: RosterSubject[] = [
  { id: 1, name: 'Math', maxScore: 100 },
  { id: 2, name: 'English', maxScore: 100 },
]

describe('computeRosterRows', () => {
  it('computes total and average from entered scores', () => {
    const students = [mkStudent(1, 'A'), mkStudent(2, 'B')]
    const scores = {
      1: { 1: 80, 2: 90 },
      2: { 1: 60 },
    }
    const rows = computeRosterRows(students, subjects, scores)
    expect(rows[0].total).toBe(170)
    expect(rows[0].maxTotal).toBe(200)
    expect(rows[0].average).toBe(85)
    // Student 2 entered only Math: total=60, avg=60/200*100=30
    expect(rows[1].total).toBe(60)
    expect(rows[1].average).toBe(30)
  })

  it('ranks by average descending, ties share rank (competition style)', () => {
    const students = [mkStudent(1, 'A'), mkStudent(2, 'B'), mkStudent(3, 'C')]
    const scores = {
      1: { 1: 100, 2: 100 },  // 100%
      2: { 1: 100, 2: 100 },  // 100%
      3: { 1: 80, 2: 80 },    // 80%
    }
    const rows = computeRosterRows(students, subjects, scores)
    expect(rows.find((r) => r.studentId === 1)?.rank).toBe(1)
    expect(rows.find((r) => r.studentId === 2)?.rank).toBe(1)
    expect(rows.find((r) => r.studentId === 3)?.rank).toBe(3)  // 1, 1, 3
  })

  it('students with no scores have null average and rank', () => {
    const students = [mkStudent(1, 'A'), mkStudent(2, 'B')]
    const scores = { 1: { 1: 80, 2: 80 } }
    const rows = computeRosterRows(students, subjects, scores)
    expect(rows[0].rank).toBe(1)
    expect(rows[1].total).toBe(0)
    expect(rows[1].average).toBeNull()
    expect(rows[1].rank).toBeNull()
  })

  it('excludes archived students', () => {
    const students = [mkStudent(1, 'A'), { ...mkStudent(2, 'B'), archivedAt: 1 }]
    const rows = computeRosterRows(students, subjects, { 1: { 1: 50 } })
    expect(rows).toHaveLength(1)
  })

  it('handles zero subjects gracefully', () => {
    const students = [mkStudent(1, 'A')]
    const rows = computeRosterRows(students, [], {})
    expect(rows[0].total).toBe(0)
    expect(rows[0].maxTotal).toBe(0)
    expect(rows[0].average).toBeNull()
    expect(rows[0].rank).toBeNull()
  })

  it('pulls remark from the remarks map', () => {
    const students = [mkStudent(1, 'A')]
    const rows = computeRosterRows(students, subjects, { 1: { 1: 90 } }, { 1: 'Good progress' })
    expect(rows[0].remark).toBe('Good progress')
  })

  it('returns empty array for no students', () => {
    expect(computeRosterRows([], subjects, {})).toEqual([])
  })
})
