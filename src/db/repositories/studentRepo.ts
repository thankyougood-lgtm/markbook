import { db, type StudentRow } from '../db'

export interface CreateStudentInput {
  classId: number
  serialNo: number
  fullName: string
  sex?: 'M' | 'F' | null
  age?: number | null
  order?: number
}

export async function listStudents(classId: number) {
  return db.students.where('classId').equals(classId).filter((student) => !student.archivedAt).sortBy('order')
}

export async function createStudent(input: CreateStudentInput): Promise<StudentRow & { id: number }> {
  const trimmed = input.fullName.trim()
  if (!trimmed) {
    throw new Error('Student name is required')
  }

  const order = input.order ?? (await db.students.where('classId').equals(input.classId).count())
  const record: StudentRow = {
    classId: input.classId,
    serialNo: input.serialNo,
    fullName: trimmed,
    sex: input.sex ?? null,
    age: input.age ?? null,
    order,
    archivedAt: null,
  }

  const id = (await db.students.add(record)) as number
  return { ...record, id }
}

export async function updateStudent(student: StudentRow) {
  const next = { ...student, fullName: student.fullName.trim() }
  await db.students.put(next)
  return next
}

export async function archiveStudent(studentId: number) {
  const record = await db.students.get(studentId)
  if (!record) return null

  const updated = { ...record, archivedAt: Date.now() }
  await db.students.put(updated)
  return updated
}

export async function restoreStudent(studentId: number) {
  const record = await db.students.get(studentId)
  if (!record) return null

  const updated = { ...record, archivedAt: null }
  await db.students.put(updated)
  return updated
}
