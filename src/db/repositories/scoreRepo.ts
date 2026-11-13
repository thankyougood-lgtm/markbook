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
  const classStudentIds = new Set(
    (await db.students.where('classId').equals(classId).filter((student) => !student.archivedAt).primaryKeys()) as number[],
  )

  const map: Record<number, Record<number, ScoreValue>> = {}
  const allScores = await db.scores.toArray()

  for (const row of allScores) {
    if (row.semester !== semester) continue
    if (!classStudentIds.has(row.studentId)) continue
    // Removed the subjectIds check to ensure all marks load.
    map[row.studentId] ??= {}
    map[row.studentId][row.subjectId] = row.value
  }

  return map
}

export async function setScore(input: SetScoreInput): Promise<ScoreRow> {
  const rawValue = input.value === '' || input.value === null ? null : input.value
  const nextValue = typeof rawValue === 'string' ? (rawValue.trim() === '' ? null : rawValue) : rawValue

  // Force numbers to prevent undefined key collisions
  const safeStudentId = Number(input.studentId)
  const safeSemester = Number(input.semester)
  const safeSubjectId = Number(input.subjectId)

  if (!Number.isFinite(safeStudentId) || !Number.isFinite(safeSubjectId)) {
    console.error('[SCORE REPO] Invalid IDs for setScore:', input)
    throw new Error('Invalid studentId or subjectId')
  }

  const record: ScoreRow = {
    studentId: safeStudentId,
    semester: safeSemester as 1 | 2,
    subjectId: safeSubjectId,
    value: nextValue,
  }

  await db.scores.put(record)
  return record
}
