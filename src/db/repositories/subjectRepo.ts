import { db } from '../db'

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

export async function createSubject(input: CreateSubjectInput) {
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

  const order = input.order ?? (await db.subjects.where('classId').equals(input.classId).count())
  const record = {
    classId: input.classId,
    name: trimmed,
    maxScore: input.maxScore,
    order,
    archivedAt: null,
    kind: input.kind ?? 'score',
    options: input.options ?? [],
  }

  const id = await db.subjects.add(record)
  return { ...record, id }
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
