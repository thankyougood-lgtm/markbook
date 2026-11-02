import { db, type AttendanceRecordRow, type AttendanceSessionRow, type AttendanceStatus } from '../schema';

export async function listSessions(classId: number, date: string): Promise<AttendanceSessionRow[]> {
  return db.attendanceSessions.where({ classId, date }).toArray();
}

export async function getOrCreateSession(
  classId: number,
  date: string,
  period: number,
  subjectId: number | null
): Promise<number> {
  const existing = await db.attendanceSessions
    .where({ classId, date, period })
    .filter((s) => s.subjectId === subjectId)
    .first();
  if (existing) return existing.id;
  return db.attendanceSessions.add({ classId, date, period, subjectId } as AttendanceSessionRow);
}

export async function listRecords(sessionId: number): Promise<AttendanceRecordRow[]> {
  return db.attendanceRecords.where('sessionId').equals(sessionId).toArray();
}

export async function setRecord(sessionId: number, studentId: number, status: AttendanceStatus): Promise<void> {
  await db.attendanceRecords.put({ sessionId, studentId, status });
}
