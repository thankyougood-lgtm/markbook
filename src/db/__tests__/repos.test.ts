import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '../db'
import * as classRepo from '../repositories/classRepo'
import * as subjectRepo from '../repositories/subjectRepo'
import * as studentRepo from '../repositories/studentRepo'
import * as scoreRepo from '../repositories/scoreRepo'
import * as studentSemesterRepo from '../repositories/studentSemesterRepo'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('v0.2 repositories', () => {
  it('creates classes, subjects, students, and stores a blank score as null', async () => {
    const classRecord = await classRepo.createClass({
      name: 'Grade 11 A',
      grade: 11,
      section: 'A',
      academicYear: '2018 EC',
      schoolName: 'Bole Secondary',
      teacherName: 'Abebe',
    })

    const subject = await subjectRepo.createSubject({
      classId: classRecord.id,
      name: 'Math',
      maxScore: 100,
      kind: 'score',
    })

    const student = await studentRepo.createStudent({
      classId: classRecord.id,
      serialNo: 1,
      fullName: 'Alice',
    })

    await expect(scoreRepo.setScore({ studentId: student.id, semester: 1, subjectId: subject.id, value: null })).resolves.toBeDefined()
    await expect(scoreRepo.getScore({ studentId: student.id, semester: 1, subjectId: subject.id })).resolves.toBeNull()

    const classes = await classRepo.listClasses()
    expect(classes).toHaveLength(1)
    expect(classes[0].name).toBe('Grade 11 A')
  })

  it('prevents duplicate compound keys and restores sheets after closing', async () => {
    const classRecord = await classRepo.createClass({
      name: 'Grade 11 A',
      grade: 11,
      section: 'A',
      academicYear: '2018 EC',
      schoolName: 'Bole Secondary',
      teacherName: 'Abebe',
    })

    await expect(
      classRepo.createClass({
        name: 'Grade 11 A',
        grade: 11,
        section: 'A',
        academicYear: '2018 EC',
        schoolName: 'Bole Secondary',
        teacherName: 'Abebe',
      }),
    ).rejects.toThrow()

    const student = await studentRepo.createStudent({
      classId: classRecord.id,
      serialNo: 1,
      fullName: 'Alice',
    })

    await subjectRepo.createSubject({ classId: classRecord.id, name: 'Math', maxScore: 100, kind: 'score' })
    await scoreRepo.setScore({ studentId: student.id, semester: 1, subjectId: 1, value: 90 })

    await classRepo.closeSheet(classRecord.id, 1)
    const reopened = await classRepo.openSheet(classRecord.id, 1)
    expect(reopened).not.toBeNull()
    if (!reopened) {
      throw new Error('Sheet should reopen')
    }
    expect(reopened.openSemesters).toContain(1)
    const score = await scoreRepo.getScore({ studentId: student.id, semester: 1, subjectId: 1 })
    expect(score).toBe(90)
  })

  it('reuses an existing class for a second semester without duplicating students', async () => {
    const firstClass = await classRepo.createClass({
      name: 'Grade 11 A',
      grade: 11,
      section: 'A',
      academicYear: '2018 EC',
      schoolName: 'Bole Secondary',
      teacherName: 'Abebe',
      semester: 1,
    })

    const student = await studentRepo.createStudent({
      classId: firstClass.id,
      serialNo: 1,
      fullName: 'Alice',
    })

    const secondClass = await classRepo.createClass({
      name: 'Grade 11 A',
      grade: 11,
      section: 'A',
      academicYear: '2018 EC',
      schoolName: 'Bole Secondary',
      teacherName: 'Abebe',
      semester: 2,
    })

    expect(secondClass.id).toBe(firstClass.id)
    expect(secondClass.openSemesters).toEqual(expect.arrayContaining([1, 2]))
    expect(await classRepo.listClasses()).toHaveLength(1)
    expect(await studentRepo.listStudents(firstClass.id)).toHaveLength(1)
    expect((await studentRepo.listStudents(firstClass.id)).map((row) => row.id)).toContain(student.id)
  })

  it('stores semester remarks separately from score data', async () => {
    const classRecord = await classRepo.createClass({
      name: 'Grade 10 B',
      grade: 10,
      section: 'B',
      academicYear: '2017 EC',
      schoolName: 'Kirkos Secondary',
      teacherName: 'Daniel',
      semester: 1,
    })

    const student = await studentRepo.createStudent({
      classId: classRecord.id,
      serialNo: 1,
      fullName: 'Bob',
    })

    await studentSemesterRepo.setRemark({ studentId: student.id, semester: 1, remark: 'Strong effort' })
    await expect(studentSemesterRepo.getRemark({ studentId: student.id, semester: 1 })).resolves.toBe('Strong effort')

    await studentSemesterRepo.setRemark({ studentId: student.id, semester: 2, remark: 'Needs support' })
    await expect(studentSemesterRepo.getRemark({ studentId: student.id, semester: 2 })).resolves.toBe('Needs support')
    await expect(studentSemesterRepo.getRemark({ studentId: student.id, semester: 1 })).resolves.toBe('Strong effort')
  })

  it('stores non-score values as text instead of coercing them to null', async () => {
    const classRecord = await classRepo.createClass({
      name: 'Grade 10 B',
      grade: 10,
      section: 'B',
      academicYear: '2017 EC',
      schoolName: 'Kirkos Secondary',
      teacherName: 'Daniel',
    })

    const student = await studentRepo.createStudent({
      classId: classRecord.id,
      serialNo: 1,
      fullName: 'Bob',
    })

    const subject = await subjectRepo.createSubject({
      classId: classRecord.id,
      name: 'Attendance',
      maxScore: 100,
      kind: 'dropdown',
      options: ['Present', 'Absent', 'Late'],
    })

    const saved = await scoreRepo.setScore({
      studentId: student.id,
      semester: 1,
      subjectId: subject.id,
      value: 'Present',
    })

    expect(saved.value).toBe('Present')
    await expect(scoreRepo.getScore({ studentId: student.id, semester: 1, subjectId: subject.id })).resolves.toBe('Present')
  })

  it('archives students and lists subjects for the class', async () => {
    const classRecord = await classRepo.createClass({
      name: 'Grade 10 B',
      grade: 10,
      section: 'B',
      academicYear: '2017 EC',
      schoolName: 'Kirkos Secondary',
      teacherName: 'Daniel',
    })

    const student = await studentRepo.createStudent({
      classId: classRecord.id,
      serialNo: 1,
      fullName: 'Bob',
    })

    await subjectRepo.createSubject({ classId: classRecord.id, name: 'Science', maxScore: 100, kind: 'score' })
    await studentRepo.archiveStudent(student.id)

    const activeStudents = await studentRepo.listStudents(classRecord.id)
    expect(activeStudents).toHaveLength(0)

    const subjects = await subjectRepo.listSubjects(classRecord.id)
    expect(subjects).toHaveLength(1)
    expect(subjects[0].name).toBe('Science')
  })
})
