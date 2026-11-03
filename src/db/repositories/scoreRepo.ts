import { db, type ScoreRow } from '../db'

export interface SetScoreInput {
  studentId: number
  semester: 1 | 2
  subjectId: number
  value: number | null | string
}

export async function getScore(input: Omit<SetScoreInput, 'value'>): Promise<number | null> {
  const row = await db.scores.get([input.studentId, input.semester, input.subjectId])
  return row?.value ?? null
}

export async function setScore(input: SetScoreInput): Promise<ScoreRow> {
  const nextValue = input.value === '' || input.value === null ? null : Number(input.value)
  const record: ScoreRow = {
    studentId: input.studentId,
    semester: input.semester,
    subjectId: input.subjectId,
    value: Number.isNaN(nextValue) ? null : nextValue,
  }

  await db.scores.put(record)
  return record
}
