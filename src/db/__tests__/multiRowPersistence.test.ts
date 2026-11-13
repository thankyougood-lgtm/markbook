import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '../db'
import * as studentRepo from '../repositories/studentRepo'
import * as scoreRepo from '../repositories/scoreRepo'
import * as subjectRepo from '../repositories/subjectRepo'

describe('Multi-row persistence', () => {
  beforeEach(async () => {
    await db.students.clear()
    await db.scores.clear()
    await db.subjects.clear()
  })

  it('saves 3 students and 3 scores, and reads all of them back', async () => {
    const classId = 1
    const semester = 1

    // 1. Create the subject FIRST
    const subj = await subjectRepo.createSubject({ classId, name: 'Math', maxScore: 100 })
    const subjectId = subj.id!
    console.log('Created subject ID:', subjectId)

    // 2. Create 3 students
    const s1 = await studentRepo.createStudent({ classId, serialNo: 1, fullName: 'Student 1' })
    const s2 = await studentRepo.createStudent({ classId, serialNo: 2, fullName: 'Student 2' })
    const s3 = await studentRepo.createStudent({ classId, serialNo: 3, fullName: 'Student 3' })
    console.log('Created students:', s1.id, s2.id, s3.id)

    // 3. Save a score for each student
    await scoreRepo.setScore({ studentId: s1.id!, semester, subjectId, value: 85 })
    await scoreRepo.setScore({ studentId: s2.id!, semester, subjectId, value: 92 })
    await scoreRepo.setScore({ studentId: s3.id!, semester, subjectId, value: 78 })

    // 4. Check what's actually in the DB
    const rawScores = await db.scores.toArray()
    console.log('Raw scores in DB:', rawScores)
    console.log('Raw students in DB:', await db.students.toArray())
    console.log('Raw subjects in DB:', await db.subjects.toArray())

    const readStudents = await studentRepo.listStudents(classId)
    console.log('Read students count:', readStudents.length)
    expect(readStudents.length).toBe(3)

    const readScores = await scoreRepo.listScoresForSemester(classId, semester)
    console.log('Read scores:', readScores)
    expect(Object.keys(readScores).length).toBe(3)
    expect(readScores[s1.id!][subjectId]).toBe(85)
    expect(readScores[s2.id!][subjectId]).toBe(92)
    expect(readScores[s3.id!][subjectId]).toBe(78)
  })
})
