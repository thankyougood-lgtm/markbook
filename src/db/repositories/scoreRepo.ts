import { db, type ScoreRow, type ScoreValue } from '../db'

export interface SetScoreInput {
  studentId: number
  semester: 1 | 2
  subjectId: number
  value: ScoreValue
}

export async function getScore(input: Omit<SetScoreInput, 'value'>): Promise<ScoreValue | null> {
  const row = await db.scores.get([input.studentId, input.semester, input.subjectId])
  return row?.value ?? null
}

export async function listScoresForSemester(classId: number, semester: 1 | 2) {
  const classStudentIds = new Set((await db.students.where('classId').equals(classId).filter((student) => !student.archivedAt).keys()) as number[])
  const subjectIds = new Set((await db.subjects.where('classId').equals(classId).filter((subject) => !subject.archivedAt).keys()) as number[])

  const map: Record<number, Record<number, ScoreValue>> = {}
  const rows = await db.scores.where('semester').equals(semester).toArray()

  for (const row of rows) {
    if (!classStudentIds.has(row.studentId) || !subjectIds.has(row.subjectId)) {
      continue
    }

    map[row.studentId] ??= {}
    map[row.studentId][row.subjectId] = row.value
  }

  return map
}

export async function setScore(input: SetScoreInput): Promise<ScoreRow> {
  const rawValue = input.value === '' || input.value === null ? null : input.value
  const nextValue = typeof rawValue === 'string' ? (rawValue.trim() === '' ? null : rawValue) : rawValue

  const record: ScoreRow = {
    studentId: input.studentId,
    semester: input.semester,
    subjectId: input.subjectId,
    value: nextValue,
  }

  await db.scores.put(record)
  return record
}
