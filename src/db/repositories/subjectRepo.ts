import { db, type SubjectRow } from '../db'

export interface CreateSubjectInput {
  classId: number
  name: string
  maxScore: number
  order?: number
  kind?: 'score' | 'text' | 'number' | 'dropdown'
  options?: string[]
}

export async function listSubjects(classId: number) {
  return db.subjects.where('classId').equals(classId).filter((subject) => !subject.archivedAt).sortBy('order')
}

export async function createSubject(input: CreateSubjectInput): Promise<SubjectRow & { id: number }> {
  const trimmed = input.name.trim()
  if (!trimmed) {
    throw new Error('Subject name is required')
  }

  const existing = await db.subjects
    .where('classId')
    .equals(input.classId)
    .filter((subject) => !subject.archivedAt && subject.name.toLowerCase() === trimmed.toLowerCase())
    .first()

  if (existing) {
    throw new Error('Subject already exists')
  }

  const kind = input.kind ?? 'score'
  const safeMaxScore = Number.isFinite(input.maxScore) && input.maxScore > 0 ? input.maxScore : 100
  const order = input.order ?? (await db.subjects.where('classId').equals(input.classId).count())
  const record: SubjectRow = {
    classId: input.classId,
    name: trimmed,
    maxScore: safeMaxScore,
    order,
    archivedAt: null,
    kind,
    options: kind === 'dropdown' ? input.options ?? ['Present', 'Absent', 'Late', 'Excused'] : [],
  }

  const id = (await db.subjects.add(record)) as number
  return { ...record, id }
}

export async function updateSubject(subject: SubjectRow) {
  const next = { ...subject, name: subject.name.trim() }
  await db.subjects.put(next)
  return next
}

export async function archiveSubject(subjectId: number) {
  const record = await db.subjects.get(subjectId)
  if (!record) return null

  const updated = { ...record, archivedAt: Date.now() }
  await db.subjects.put(updated)
  return updated
}

export async function restoreSubject(subjectId: number) {
  const record = await db.subjects.get(subjectId)
  if (!record) return null

  const updated = { ...record, archivedAt: null }
  await db.subjects.put(updated)
  return updated
}
