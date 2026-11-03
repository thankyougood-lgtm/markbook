import { db, normalizeSemesters } from '../db'

export interface CreateClassInput {
  name: string
  grade: number
  section: string
  academicYear: string
  schoolName?: string
  teacherName?: string
  semester?: 1 | 2
}

export async function listClasses() {
  return db.classes.filter((record) => !record.archivedAt).toArray()
}

export async function getClassById(classId: number) {
  return db.classes.get(classId)
}

export async function createClass(input: CreateClassInput) {
  const semester = input.semester ?? 1
  const name = input.name.trim()

  const existing = await db.classes
    .filter((record) => record.name === name && !record.archivedAt)
    .first()

  if (existing) {
    throw new Error('Class already exists')
  }

  const now = Date.now()
  const record = {
    name,
    grade: input.grade,
    section: input.section.trim(),
    academicYear: input.academicYear.trim(),
    schoolName: input.schoolName?.trim() ?? '',
    teacherName: input.teacherName?.trim() ?? '',
    createdAt: now,
    archivedAt: null,
    openSemesters: [semester],
  }

  const id = await db.classes.add(record)
  return { ...record, id }
}

export async function archiveClass(classId: number) {
  const record = await db.classes.get(classId)
  if (!record) return null

  const updated = { ...record, archivedAt: Date.now() }
  await db.classes.put(updated)
  return updated
}

export async function restoreClass(classId: number) {
  const record = await db.classes.get(classId)
  if (!record) return null

  const updated = { ...record, archivedAt: null }
  await db.classes.put(updated)
  return updated
}

export async function openSheet(classId: number, semester: 1 | 2) {
  const record = await db.classes.get(classId)
  if (!record) return null

  const openSemesters = normalizeSemesters(record.openSemesters)
  openSemesters.push(semester)
  const next = normalizeSemesters(openSemesters)

  await db.classes.update(classId, { openSemesters: next })
  return { ...record, openSemesters: next }
}

export async function closeSheet(classId: number, semester: 1 | 2) {
  const record = await db.classes.get(classId)
  if (!record) return null

  const next = normalizeSemesters(record.openSemesters).filter((item) => item !== semester)
  await db.classes.update(classId, { openSemesters: next })
  return { ...record, openSemesters: next }
}
