import { db } from '../db'

export async function listAttendanceSessions(classId: number) {
  return db.attendanceSessions.where('classId').equals(classId).toArray()
}

export async function createAttendanceSession(data: { classId: number; date: string; period: number | null; subjectId: number | null }) {
  const id = (await db.attendanceSessions.add(data)) as number
  return { ...data, id }
}
