import { describe, it, expect } from 'vitest'
import { buildRoster } from '../buildRoster'
import { autoMapSubjects } from '../autoMapSubjects'

describe('Golden 7-student roster', () => {
  it('matches the owner\'s data', () => {
    const students = [
      { id: 1, fullName: 'S1', sex: 'M' as const, age: 12 },
      { id: 2, fullName: 'S2', sex: 'M' as const, age: 12 },
      { id: 3, fullName: 'S3', sex: 'M' as const, age: 12 },
      { id: 4, fullName: 'S4', sex: 'M' as const, age: 12 },
      { id: 5, fullName: 'S5', sex: 'M' as const, age: 12 },
      { id: 6, fullName: 'S6', sex: 'M' as const, age: 12 },
      { id: 7, fullName: 'S7', sex: 'M' as const, age: 12 },
    ]
    const sem1Subjects = [
      { id: 1, classId: 1, name: 'Biology', maxScore: 100, order: 1, kind: 'score' as const },
      { id: 2, classId: 1, name: 'Physics', maxScore: 100, order: 2, kind: 'score' as const },
      { id: 3, classId: 1, name: 'chemistery', maxScore: 100, order: 3, kind: 'score' as const }, // typo
      { id: 4, classId: 1, name: 'HIP', maxScore: 100, order: 4, kind: 'score' as const },
      { id: 5, classId: 1, name: 'Biology1', maxScore: 100, order: 5, kind: 'score' as const },
    ]
    const sem2Subjects = [
      { id: 11, classId: 1, name: 'Biology', maxScore: 100, order: 1, kind: 'score' as const },
      { id: 12, classId: 1, name: 'Physics', maxScore: 100, order: 2, kind: 'score' as const },
      { id: 13, classId: 1, name: 'chemistry', maxScore: 100, order: 3, kind: 'score' as const }, // correct
      { id: 14, classId: 1, name: 'HIP', maxScore: 100, order: 4, kind: 'score' as const },
      { id: 15, classId: 1, name: 'Biology1', maxScore: 100, order: 5, kind: 'score' as const },
    ]
    
    // Golden marks
    const sem1Marks = [
      { studentId: 1, subjectId: 1, value: 78 }, { studentId: 1, subjectId: 2, value: 98 }, { studentId: 1, subjectId: 3, value: 87 }, { studentId: 1, subjectId: 4, value: 78 }, { studentId: 1, subjectId: 5, value: 78 },
      { studentId: 2, subjectId: 1, value: 80 }, { studentId: 2, subjectId: 2, value: 90 }, { studentId: 2, subjectId: 3, value: 90 }, { studentId: 2, subjectId: 4, value: 90 }, { studentId: 2, subjectId: 5, value: 92 },
      { studentId: 3, subjectId: 1, value: 78 }, { studentId: 3, subjectId: 2, value: 98 }, { studentId: 3, subjectId: 3, value: 87 }, { studentId: 3, subjectId: 4, value: 78 }, { studentId: 3, subjectId: 5, value: 78 },
      { studentId: 4, subjectId: 1, value: 50 }, { studentId: 4, subjectId: 2, value: 60 }, { studentId: 4, subjectId: 3, value: 57 }, { studentId: 4, subjectId: 4, value: 60 }, { studentId: 4, subjectId: 5, value: 60 },
      { studentId: 5, subjectId: 1, value: 90 }, { studentId: 5, subjectId: 2, value: 90 }, { studentId: 5, subjectId: 3, value: 90 }, { studentId: 5, subjectId: 4, value: 90 }, { studentId: 5, subjectId: 5, value: 89 },
      { studentId: 6, subjectId: 1, value: 84 }, { studentId: 6, subjectId: 2, value: 84 }, { studentId: 6, subjectId: 3, value: 84 }, { studentId: 6, subjectId: 4, value: 84 }, { studentId: 6, subjectId: 5, value: 82 },
      // Student 7 has no Sem I marks
    ]

    const sem2Marks = [
      { studentId: 1, subjectId: 11, value: 45 }, { studentId: 1, subjectId: 12, value: 66 }, { studentId: 1, subjectId: 13, value: 77 }, { studentId: 1, subjectId: 14, value: 99 }, { studentId: 1, subjectId: 15, value: 99 },
      { studentId: 2, subjectId: 11, value: 45 }, { studentId: 2, subjectId: 12, value: 55 }, { studentId: 2, subjectId: 13, value: 66 }, { studentId: 2, subjectId: 14, value: 86 }, { studentId: 2, subjectId: 15, value: 99 },
      { studentId: 3, subjectId: 11, value: 55 }, { studentId: 3, subjectId: 12, value: 54 }, { studentId: 3, subjectId: 13, value: 66 }, { studentId: 3, subjectId: 14, value: 99 }, { studentId: 3, subjectId: 15, value: 99 },
      { studentId: 4, subjectId: 11, value: 55 }, { studentId: 4, subjectId: 12, value: 77 }, { studentId: 4, subjectId: 13, value: 88 }, { studentId: 4, subjectId: 14, value: 99 }, { studentId: 4, subjectId: 15, value: 99 },
      { studentId: 5, subjectId: 11, value: 44 }, { studentId: 5, subjectId: 12, value: 55 }, { studentId: 5, subjectId: 13, value: 77 }, { studentId: 5, subjectId: 14, value: 99 }, { studentId: 5, subjectId: 15, value: 99 },
      { studentId: 6, subjectId: 11, value: 44 }, { studentId: 6, subjectId: 12, value: 55 }, { studentId: 6, subjectId: 13, value: 77 }, { studentId: 6, subjectId: 14, value: 99 }, { studentId: 6, subjectId: 15, value: 99 },
      { studentId: 7, subjectId: 11, value: 44 }, { studentId: 7, subjectId: 12, value: 66 }, { studentId: 7, subjectId: 13, value: 6 }, { studentId: 7, subjectId: 14, value: 77 }, { studentId: 7, subjectId: 15, value: 99 },
    ]

    const rosterSubjects = autoMapSubjects(sem1Subjects, sem2Subjects, sem1Marks, sem2Marks)
    
    // Should suggest merging chemistery and chemistry
    const chem = rosterSubjects.find(s => s.label === 'chemistery' || s.label === 'chemistry')
    expect(chem).toBeDefined()

    const model = buildRoster({
      students,
      rosterSubjects,
      sem1Marks,
      sem2Marks,
      attendanceAbsents: {},
      conduct: {},
      remarks: {}
    })

    const s1 = model.students[0]
    expect(s1.rows[0].total).toBe(419)
    expect(s1.rows[1].total).toBe(386)
    expect(s1.rows[2].total).toBe(402.5)
    expect(s1.rows[2].average).toBe(81)

    // Ranks
    expect(model.students[0].rows[0].rank).toBe(3) // S1 419
    expect(model.students[1].rows[0].rank).toBe(2) // S2 442
    expect(model.students[2].rows[0].rank).toBe(3) // S3 419
    expect(model.students[3].rows[0].rank).toBe(6) // S4 287
    expect(model.students[4].rows[0].rank).toBe(1) // S5 449
    expect(model.students[5].rows[0].rank).toBe(5) // S6 418
    expect(model.students[6].rows[0].rank).toBe(null) // S7 no marks

    // Sem II ranks
    expect(model.students[0].rows[1].rank).toBe(2) // S1 386
    expect(model.students[1].rows[1].rank).toBe(6) // S2 351
    expect(model.students[2].rows[1].rank).toBe(5) // S3 373
    expect(model.students[3].rows[1].rank).toBe(1) // S4 418
    expect(model.students[4].rows[1].rank).toBe(3) // S5 374
    expect(model.students[5].rows[1].rank).toBe(3) // S6 374
    expect(model.students[6].rows[1].rank).toBe(7) // S7 292
  })
})
