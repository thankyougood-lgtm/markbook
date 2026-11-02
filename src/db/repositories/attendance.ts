import { db, type AttendanceRecordRow, type AttendanceSessionRow, type AttendanceStatus } from '../schema';

// Queries go through the single-column classId index and filter the rest in
// memory: the schema has no compound index for classId + date + period.
export async function listSessions(classId: number, date: string): Promise<AttendanceSessionRow[]> {
  const rows = await db.attendanceSessions.where('classId').equals(classId).toArray();
  return rows.filter((s) => s.date === date);
}

export async function findSession(
  classId: number,
  date: string,
  period: number,
  subjectId: number | null
): Promise<AttendanceSessionRow | undefined> {
  const rows = await db.attendanceSessions.where('classId').equals(classId).toArray();
  return rows.find((s) => s.date === date && s.period === period && s.subjectId === subjectId);
}

export async function getOrCreateSession(
  classId: number,
  date: string,
  period: number,
  subjectId: number | null
): Promise<number> {
  const existing = await findSession(classId, date, period, subjectId);
  if (existing) return existing.id;
  return db.attendanceSessions.add({ classId, date, period, subjectId } as AttendanceSessionRow);
}

export async function listRecords(sessionId: number): Promise<AttendanceRecordRow[]> {
  return db.attendanceRecords.where('sessionId').equals(sessionId).toArray();
}

export async function setRecord(sessionId: number, studentId: number, status: AttendanceStatus): Promise<void> {
  await db.attendanceRecords.put({ sessionId, studentId, status });
}

/** Clearing a status removes the record; the session itself stays. */
export async function clearRecord(sessionId: number, studentId: number): Promise<void> {
  // The table is declared with a single 'sessionId' key, so the compound
  // [sessionId+studentId] index has to be addressed through a where clause.
  await db.attendanceRecords
    .where('[sessionId+studentId]')
    .equals([sessionId, studentId])
    .delete();
}

/** Every record of a class, across all of its sessions (used for the percent column). */
export async function listRecordsForClass(classId: number): Promise<AttendanceRecordRow[]> {
  const sessions = await db.attendanceSessions.where('classId').equals(classId).toArray();
  if (sessions.length === 0) return [];
  const ids = new Set(sessions.map((s) => s.id));
  const records = await db.attendanceRecords.toArray();
  return records.filter((r) => ids.has(r.sessionId));
}
