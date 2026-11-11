import { db, type AttendanceRecordRow, type AttendanceSessionRow } from '../db'

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function listAttendanceSessions(
  classId: number,
): Promise<Array<AttendanceSessionRow & { id: number }>> {
  const rows = await db.attendanceSessions
    .where('classId')
    .equals(classId)
    .filter((s) => !s.archivedAt)
    .toArray()
  // Sort by date asc, then id asc for ties
  rows.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date)
    if (dateCmp !== 0) return dateCmp
    return (a.id ?? 0) - (b.id ?? 0)
  })
  return rows as Array<AttendanceSessionRow & { id: number }>
}

export async function createAttendanceSession(data: {
  classId: number
  date: string
  period: number | null
  subjectId: number | null
}): Promise<AttendanceSessionRow & { id: number }> {
  const id = (await db.attendanceSessions.add({ ...data, archivedAt: null })) as number
  return { ...data, id, archivedAt: null }
}

export async function updateAttendanceSession(
  id: number,
  data: { date: string; period: number | null; subjectId: number | null },
): Promise<void> {
  await db.attendanceSessions.update(id, data)
}

export async function archiveAttendanceSession(id: number): Promise<void> {
  await db.attendanceSessions.update(id, { archivedAt: Date.now() })
}

// ─── Records ─────────────────────────────────────────────────────────────────

export async function listAttendanceRecords(
  sessionIds: number[],
): Promise<AttendanceRecordRow[]> {
  if (sessionIds.length === 0) return []
  return db.attendanceRecords
    .where('sessionId')
    .anyOf(sessionIds)
    .toArray()
}

/**
 * Upsert an attendance record. Pass status = null to remove (blank = not taken).
 */
export async function setAttendanceRecord(
  sessionId: number,
  studentId: number,
  status: 'P' | 'A' | 'L' | 'E' | null,
): Promise<void> {
  if (status === null) {
    await db.attendanceRecords.delete([sessionId, studentId])
  } else {
    await db.attendanceRecords.put({ sessionId, studentId, status })
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export type AttendanceSummary = { P: number; A: number; L: number; E: number }

/**
 * Returns per-student summary counts for the given session set.
 */
export async function getAttendanceSummary(
  studentIds: number[],
  sessionIds: number[],
): Promise<Record<number, AttendanceSummary>> {
  const result: Record<number, AttendanceSummary> = {}
  for (const sid of studentIds) {
    result[sid] = { P: 0, A: 0, L: 0, E: 0 }
  }

  if (sessionIds.length === 0 || studentIds.length === 0) return result

  const records = await listAttendanceRecords(sessionIds)
  const studentSet = new Set(studentIds)

  for (const rec of records) {
    if (studentSet.has(rec.studentId)) {
      const summary = result[rec.studentId]
      if (rec.status === 'P') summary.P++
      else if (rec.status === 'A') summary.A++
      else if (rec.status === 'L') summary.L++
      else if (rec.status === 'E') summary.E++
    }
  }

  return result
}
