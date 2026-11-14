import { describe, it, expect } from 'vitest'
import { buildRoster } from '../buildRoster'

describe('Multi-semester roster', () => {
  it('fills I, II, and AV rows correctly', () => {
    const students = [{ id: 1, fullName: 'A', sex: 'M' as const, age: 15 }]
    const rosterSubjects = [
      { key: 'math', label: 'Math', sem1SubjectId: 1, sem2SubjectId: 1 },
      { key: 'sci', label: 'Sci', sem1SubjectId: 2, sem2SubjectId: 2 }
    ]
    
    const sem1Marks = [
      { studentId: 1, subjectId: 1, value: 80 },
      { studentId: 1, subjectId: 2, value: 90 },
    ]
    const sem2Marks = [
      { studentId: 1, subjectId: 1, value: 70 },
      { studentId: 1, subjectId: 2, value: 80 },
    ]

    const model = buildRoster({
      students,
      rosterSubjects,
      sem1Marks,
      sem2Marks,
      attendanceAbsents: {},
      conduct: {},
      remarks: {},
    })

    const block = model.students[0]
    
    // I row
    expect(block.rows[0].subjectValues['math']).toBe(80)
    expect(block.rows[0].subjectValues['sci']).toBe(90)
    
    // II row
    expect(block.rows[1].subjectValues['math']).toBe(70)
    expect(block.rows[1].subjectValues['sci']).toBe(80)
    
    // AV row
    expect(block.rows[2].subjectValues['math']).toBe(75)
    expect(block.rows[2].subjectValues['sci']).toBe(85)
  })
})
