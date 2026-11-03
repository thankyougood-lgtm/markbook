import { db } from './db'
import { createClass } from './repositories/classRepo'
import { createStudent } from './repositories/studentRepo'
import { createSubject } from './repositories/subjectRepo'

export async function createSampleData() {
  const existing = await db.classes.count()
  if (existing > 0) {
    return []
  }

  const classRecord = await createClass({
    name: 'Grade 11 A',
    grade: 11,
    section: 'A',
    academicYear: '2018 EC',
    schoolName: 'Sample School',
    teacherName: 'Sample Teacher',
    semester: 1,
  })

  for (let i = 1; i <= 10; i += 1) {
    await createStudent({ classId: classRecord.id, serialNo: i, fullName: `Student ${i}`, sex: i % 2 === 0 ? 'M' : 'F', age: 16 + (i % 4), order: i })
  }

  for (const item of ['Math', 'English', 'Biology', 'ICT', 'History']) {
    await createSubject({ classId: classRecord.id, name: item, maxScore: 100, kind: 'score' })
  }

  return [classRecord]
}
