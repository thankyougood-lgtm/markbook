import { describe, it, expect } from 'vitest'
import { buildRoster } from '../buildRoster'
import { formatAcademicYear } from '../academicYear'

describe('formatAcademicYear', () => {
  it('parses EC year correctly', () => {
    expect(formatAcademicYear('2018 EC')).toBe('2018E.C/2026G.C.')
    expect(formatAcademicYear('2016')).toBe('2016E.C/2024G.C.')
    expect(formatAcademicYear('Invalid')).toBe('Invalid')
  })
})

describe('buildRoster', () => {
  it('calculates the golden numbers correctly', () => {
    const students = [{ id: 1, fullName: 'Test', sex: 'M' as const, age: 17 }]
    const subjects = [
      { id: 1, label: 'Sub1' }, { id: 2, label: 'Sub2' }, { id: 3, label: 'Sub3' },
      { id: 4, label: 'Sub4' }, { id: 5, label: 'Sub5' }, { id: 6, label: 'Sub6' },
      { id: 7, label: 'Sub7' }
    ]
    
    const sem1Vals = [43, 48, 52, 65, 58, 68, 77]
    const sem2Vals = [73, 46, 64, 58, 68, 74, 76]

    const sem1Marks = subjects.map((s, i) => ({ studentId: 1, subjectLabel: s.label, value: sem1Vals[i] }))
    const sem2Marks = subjects.map((s, i) => ({ studentId: 1, subjectLabel: s.label, value: sem2Vals[i] }))

    const result = buildRoster({
      students, subjects, sem1Marks, sem2Marks,
      attendanceAbsents: {}, conduct: {}, remarks: {}
    })

    const block = result.students[0]
    
    // I row
    expect(block.rows[0].total).toBe(411)
    expect(block.rows[0].average).toBe(59)
    
    // II row
    expect(block.rows[1].total).toBe(459)
    expect(block.rows[1].average).toBe(66)
    
    // AV row
    expect(block.rows[2].total).toBe(435)
    expect(block.rows[2].average).toBe(62)
    
    // AV subject values (e.g. Sub1: (43+73)/2 = 58)
    expect(block.rows[2].subjectValues['Sub1']).toBe(58)
    expect(block.rows[2].subjectValues['Sub4']).toBe(61.5)
  })

  it('blanks stay blank, no zeros', () => {
    const students = [{ id: 1, fullName: 'Test', sex: 'M' as const, age: 17 }]
    const subjects = [{ id: 1, label: 'Math' }]
    const result = buildRoster({
      students, subjects, sem1Marks: [{ studentId: 1, subjectLabel: 'Math', value: 50 }],
      sem2Marks: [], attendanceAbsents: {}, conduct: {}, remarks: {}
    })
    
    const block = result.students[0]
    // Sem II is completely blank
    expect(block.rows[1].total).toBeNull()
    expect(block.rows[1].average).toBeNull()
    
    // AV row is blank because Sem II is missing
    expect(block.rows[2].total).toBeNull()
    expect(block.rows[2].average).toBeNull()
  })

  it('ties share rank', () => {
    const students = [
      { id: 1, fullName: 'A', sex: 'M' as const, age: 17 },
      { id: 2, fullName: 'B', sex: 'M' as const, age: 17 },
      { id: 3, fullName: 'C', sex: 'M' as const, age: 17 }
    ]
    const subjects = [{ id: 1, label: 'Math' }]
    const sem1Marks = [
      { studentId: 1, subjectLabel: 'Math', value: 90 },
      { studentId: 2, subjectLabel: 'Math', value: 90 },
      { studentId: 3, subjectLabel: 'Math', value: 80 }
    ]
    const result = buildRoster({
      students, subjects, sem1Marks, sem2Marks: [], attendanceAbsents: {}, conduct: {}, remarks: {}
    })
    
    expect(result.students[0].rows[0].rank).toBe(1)
    expect(result.students[1].rows[0].rank).toBe(1)
    expect(result.students[2].rows[0].rank).toBe(3) // Skips 2
  })
})
