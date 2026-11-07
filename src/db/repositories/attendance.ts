import {
  db,
  type AttendanceRecordRow,
  type AttendanceSessionRow,
  type AttendanceStatus,
  type Semester
} from '../schema';

// Queries go through the single-column classId index and filter the rest in
// memory: the schema has no compound index for classId + date + period.
export async function listSessions(
  classId: number,
  date: string,
  semester?: Semester
): Promise<AttendanceSessionRow[]> {
  const rows = await db.attendanceSessions.where('classId').equals(classId).toArray();
  return rows.filter(
    (s) => s.date === date && (semester === undefined || (s.semester ?? 1) === semester)
  );
}

/** All sessions of a class, including legacy sessions as Semester I. */
export async function listSessionsForClass(
  classId: number,
  semester?: Semester
): Promise<AttendanceSessionRow[]> {
  const rows = await db.attendanceSessions.where('classId').equals(classId).toArray();
  return rows.filter((s) => semester === undefined || (s.semester ?? 1) === semester);
}

export async function findSession(
  classId: number,
  date: string,
  period: number,
  subjectId: number | null,
  semester?: Semester
): Promise<AttendanceSessionRow | undefined> {
  const rows = await db.attendanceSessions.where('classId').equals(classId).toArray();
  return rows.find(
    (s) =>
      s.date === date &&
      s.period === period &&
      s.subjectId === subjectId &&
      (semester === undefined || (s.semester ?? 1) === semester)
  );
}

export async function getOrCreateSession(
  classId: number,
  date: string,
  period: number,
  subjectId: number | null,
  semester: Semester = 1
): Promise<number> {
  const existing = await findSession(classId, date, period, subjectId, semester);
  if (existing) return existing.id;
  return db.attendanceSessions.add({ classId, date, period, subjectId, semester } as AttendanceSessionRow);
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

/** Replace the records of one session in a single transaction.
 *  When studentIds is given, only those students are cleared/rewritten, so
 *  records for archived students outside the current roster are preserved. */
export async function replaceSessionRecords(
  sessionId: number,
  statuses: Record<number, AttendanceStatus>,
  studentIds?: number[]
): Promise<void> {
  await db.transaction('rw', db.attendanceRecords, async () => {
    const scope = studentIds ? new Set(studentIds) : null;
    const existing = await db.attendanceRecords.where('sessionId').equals(sessionId).toArray();
    const merged = new Map<number, AttendanceRecordRow>();
    // Keep records outside the current roster scope (for example archived
    // students), then apply the incoming statuses for the scoped students.
    for (const record of existing) {
      if (scope && !scope.has(record.studentId)) merged.set(record.studentId, record);
    }
    for (const [studentId, status] of Object.entries(statuses)) {
      const id = Number(studentId);
      merged.set(id, { sessionId, studentId: id, status });
    }
    await db.attendanceRecords.where('sessionId').equals(sessionId).delete();
    const rows = [...merged.values()];
    if (rows.length > 0) await db.attendanceRecords.bulkPut(rows);
  });
}

/** Every record of a class, optionally limited to one semester. */
export async function listRecordsForClass(
  classId: number,
  semester?: Semester
): Promise<AttendanceRecordRow[]> {
  const sessions = await db.attendanceSessions.where('classId').equals(classId).toArray();
  const ids = new Set(
    sessions
      .filter((s) => semester === undefined || (s.semester ?? 1) === semester)
      .map((s) => s.id)
  );
  if (ids.size === 0) return [];
  return db.attendanceRecords.where('sessionId').anyOf([...ids]).toArray();
}
