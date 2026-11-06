import { db, normalizeSemesters, type MarkBookClass } from '../db'

export interface CreateClassInput {
  name: string
  grade: number
  section: string
  academicYear: string
  schoolName?: string
  teacherName?: string
  semester?: 1 | 2
}

export async function listClasses(): Promise<Array<MarkBookClass & { id: number }>> {
  return db.classes.filter((record) => !record.archivedAt).toArray() as Promise<Array<MarkBookClass & { id: number }>>
}

export async function getClassById(classId: number): Promise<(MarkBookClass & { id: number }) | undefined> {
  return db.classes.get(classId) as Promise<(MarkBookClass & { id: number }) | undefined>
}

export async function createClass(input: CreateClassInput): Promise<MarkBookClass & { id: number }> {
  const semester = input.semester ?? 1
  const name = input.name.trim()
  const normalizedSection = input.section.trim().toUpperCase()
  const normalizedAcademicYear = input.academicYear.trim()

  const existing = await db.classes
    .filter(
      (record) =>
        !record.archivedAt &&
        record.grade === input.grade &&
        String(record.section).trim().toUpperCase() === normalizedSection &&
        String(record.academicYear).trim() === normalizedAcademicYear,
    )
    .first()

  if (existing) {
    const openSemesters = normalizeSemesters(existing.openSemesters ?? [])
    if (openSemesters.includes(semester)) {
      throw new Error('Class already exists')
    }

    const nextOpenSemesters = normalizeSemesters([...openSemesters, semester])
    await db.classes.update(existing.id as number, { openSemesters: nextOpenSemesters })
    return { ...existing, openSemesters: nextOpenSemesters, id: existing.id as number }
  }

  const duplicateName = await db.classes.filter((record) => !record.archivedAt && record.name === name).first()
  if (duplicateName) {
    throw new Error('Class already exists')
  }

  const now = Date.now()
  const record = {
    name,
    grade: input.grade,
    section: normalizedSection,
    academicYear: normalizedAcademicYear,
    schoolName: input.schoolName?.trim() ?? '',
    teacherName: input.teacherName?.trim() ?? '',
    createdAt: now,
    archivedAt: null,
    openSemesters: [semester],
  }

  const id = (await db.classes.add(record)) as number
  return { ...record, id }
}

export async function archiveClass(classId: number): Promise<(MarkBookClass & { id: number }) | null> {
  const record = await db.classes.get(classId)
  if (!record) return null

  const updated = { ...record, archivedAt: Date.now(), id: record.id as number }
  await db.classes.put(updated)
  return updated
}

export async function restoreClass(classId: number): Promise<(MarkBookClass & { id: number }) | null> {
  const record = await db.classes.get(classId)
  if (!record) return null

  const updated = { ...record, archivedAt: null, id: record.id as number }
  await db.classes.put(updated)
  return updated
}

export async function openSheet(classId: number, semester: 1 | 2): Promise<(MarkBookClass & { id: number }) | null> {
  const record = await db.classes.get(classId)
  if (!record) return null

  const openSemesters = normalizeSemesters(record.openSemesters)
  openSemesters.push(semester)
  const next = normalizeSemesters(openSemesters)

  await db.classes.update(classId, { openSemesters: next })
  return { ...record, openSemesters: next, id: record.id as number }
}

export async function closeSheet(classId: number, semester: 1 | 2): Promise<(MarkBookClass & { id: number }) | null> {
  const record = await db.classes.get(classId)
  if (!record) return null

  const next = normalizeSemesters(record.openSemesters).filter((item) => item !== semester)
  await db.classes.update(classId, { openSemesters: next })
  return { ...record, openSemesters: next, id: record.id as number }
}
