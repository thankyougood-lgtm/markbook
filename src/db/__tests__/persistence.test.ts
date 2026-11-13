import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '../db'
import * as studentRepo from '../repositories/studentRepo'
import * as scoreRepo from '../repositories/scoreRepo'

describe('Data Persistence', () => {
  beforeEach(async () => {
    await db.students.clear()
    await db.scores.clear()
  })

  it('saves a student and a mark to the database', async () => {
    const student = await studentRepo.createStudent({
      classId: 1, serialNo: 1, fullName: 'Test Student', order: 0
    })
    
    await scoreRepo.setScore({
      studentId: student.id!, semester: 1, subjectId: 1, value: 85
    })

    const savedStudent = await db.students.get(student.id!)
    const savedScore = await db.scores.get([student.id!, 1, 1])

    expect(savedStudent?.fullName).toBe('Test Student')
    expect(savedScore?.value).toBe(85)
  })
})
