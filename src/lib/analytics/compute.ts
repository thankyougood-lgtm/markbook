import type {
  AttendanceRecordRow,
  AttendanceSessionRow,
  StudentRow,
  SubjectRow,
} from '../../db/db'

export interface ScoreMatrix {
  [studentId: number]: { [subjectId: number]: number | string | null }
}

export interface StudentSummary {
  studentId: number
  name: string
  average: number | null      // percentage 0..100, null if no scores entered
  attendancePct: number | null // percentage 0..100, null if no sessions taken
  attended: number
  taken: number
}

export interface SubjectAverage {
  subjectId: number
  name: string
  maxScore: number
  averagePct: number | null   // null if no scores entered
  count: number
}

export interface DistributionBucket {
  label: string               // "0–20" ... "80–100"
  count: number
}

export interface AttendanceBreakdown {
  P: number
  A: number
  L: number
  E: number
  total: number               // P+A+L+E
}

export interface AttendanceTrendPoint {
  sessionId: number
  date: string
  period: number | null
  attendancePct: number | null  // P / (students with any status) — null if no records
  attended: number
  taken: number
}

export interface SexSplit {
  M: number
  F: number
  blank: number
}

// ─── Helpers ────────────────────────────────────────────────────────────
function isScoreSubject(s: SubjectRow): boolean {
  return (s.kind ?? 'score') === 'score'
}
function isActive<T extends { archivedAt?: number | null }>(x: T): boolean {
  return !x.archivedAt
}
function scoreNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

// ─── Overview counts ────────────────────────────────────────────────────
export function computeOverview(
  students: StudentRow[],
  subjects: SubjectRow[],
  sessions: AttendanceSessionRow[],
) {
  return {
    studentCount: students.filter(isActive).length,
    subjectCount: subjects.filter(isActive).filter(isScoreSubject).length,
    sessionCount: sessions.filter(isActive).length,
  }
}

// ─── Per-subject averages ───────────────────────────────────────────────
export function computeSubjectAverages(
  scores: ScoreMatrix,
  subjects: SubjectRow[],
  students: StudentRow[],
): SubjectAverage[] {
  const activeStudents = students.filter(isActive)
  const activeScoreSubjects = subjects.filter(isActive).filter(isScoreSubject)

  return activeScoreSubjects.map((subject) => {
    if (subject.id == null) {
      return { subjectId: -1, name: subject.name, maxScore: subject.maxScore, averagePct: null, count: 0 }
    }
    const sid = subject.id
    let sum = 0
    let count = 0
    for (const student of activeStudents) {
      if (student.id == null) continue
      const value = scoreNumber(scores[student.id]?.[sid])
      if (value == null) continue
      sum += value
      count += 1
    }
    const averagePct = count > 0 && subject.maxScore > 0
      ? Math.round((sum / count / subject.maxScore) * 1000) / 10
      : null
    return {
      subjectId: sid,
      name: subject.name,
      maxScore: subject.maxScore,
      averagePct,
      count,
    }
  })
}

// ─── Score distribution ─────────────────────────────────────────────────
// Bands are % of each subject's maxScore. Each student contributes once
// per subject with an entered score.
export function computeScoreDistribution(
  scores: ScoreMatrix,
  subjects: SubjectRow[],
  students: StudentRow[],
): DistributionBucket[] {
  const activeStudents = students.filter(isActive)
  const activeScoreSubjects = subjects.filter(isActive).filter(isScoreSubject)
  const buckets: DistributionBucket[] = [
    { label: '0–20', count: 0 },
    { label: '20–40', count: 0 },
    { label: '40–60', count: 0 },
    { label: '60–80', count: 0 },
    { label: '80–100', count: 0 },
  ]

  for (const student of activeStudents) {
    if (student.id == null) continue
    const row = scores[student.id] ?? {}
    for (const subject of activeScoreSubjects) {
      if (subject.id == null) continue
      const value = scoreNumber(row[subject.id])
      if (value == null || subject.maxScore <= 0) continue
      const pct = (value / subject.maxScore) * 100
      if (pct <= 20) buckets[0].count += 1
      else if (pct <= 40) buckets[1].count += 1
      else if (pct <= 60) buckets[2].count += 1
      else if (pct <= 80) buckets[3].count += 1
      else buckets[4].count += 1
    }
  }
  return buckets
}

// ─── Attendance breakdown (overall) ─────────────────────────────────────
export function computeAttendanceBreakdown(
  records: AttendanceRecordRow[],
  sessions: AttendanceSessionRow[],
  students: StudentRow[],
): AttendanceBreakdown {
  const activeSessionIds = new Set(sessions.filter(isActive).map((s) => s.id).filter((id): id is number => id != null))
  const activeStudentIds = new Set(students.filter(isActive).map((s) => s.id).filter((id): id is number => id != null))

  const out: AttendanceBreakdown = { P: 0, A: 0, L: 0, E: 0, total: 0 }
  for (const r of records) {
    if (!activeSessionIds.has(r.sessionId)) continue
    if (!activeStudentIds.has(r.studentId)) continue
    out[r.status] += 1
    out.total += 1
  }
  return out
}

// ─── Attendance trend (per session) ─────────────────────────────────────
export function computeAttendanceTrend(
  records: AttendanceRecordRow[],
  sessions: AttendanceSessionRow[],
  students: StudentRow[],
): AttendanceTrendPoint[] {
  const activeStudents = students.filter(isActive)
  const activeStudentIds = new Set(activeStudents.map((s) => s.id).filter((id): id is number => id != null))
  const activeSessions = sessions.filter(isActive)

  const bySession = new Map<number, { P: number; A: number; L: number; E: number }>()
  for (const r of records) {
    if (!activeStudentIds.has(r.studentId)) continue
    let bucket = bySession.get(r.sessionId)
    if (!bucket) {
      bucket = { P: 0, A: 0, L: 0, E: 0 }
      bySession.set(r.sessionId, bucket)
    }
    bucket[r.status] += 1
  }

  return activeSessions
    .map((session) => {
      if (session.id == null) {
        return { sessionId: -1, date: session.date, period: session.period, attendancePct: null, attended: 0, taken: 0 }
      }
      const b = bySession.get(session.id) ?? { P: 0, A: 0, L: 0, E: 0 }
      const taken = b.P + b.A + b.L + b.E
      const attended = b.P
      const attendancePct = taken > 0 ? Math.round((attended / taken) * 1000) / 10 : null
      return {
        sessionId: session.id,
        date: session.date,
        period: session.period,
        attendancePct,
        attended,
        taken,
      }
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.sessionId - b.sessionId))
}

// ─── Sex split ──────────────────────────────────────────────────────────
export function computeSexSplit(students: StudentRow[]): SexSplit {
  const out: SexSplit = { M: 0, F: 0, blank: 0 }
  for (const s of students.filter(isActive)) {
    if (s.sex === 'M') out.M += 1
    else if (s.sex === 'F') out.F += 1
    else out.blank += 1
  }
  return out
}

// ─── Student summary table ──────────────────────────────────────────────
export function computeStudentSummaries(
  scores: ScoreMatrix,
  subjects: SubjectRow[],
  students: StudentRow[],
  records: AttendanceRecordRow[],
  sessions: AttendanceSessionRow[],
): StudentSummary[] {
  const activeStudents = students.filter(isActive)
  const activeScoreSubjects = subjects.filter(isActive).filter(isScoreSubject)
  const activeSessionIds = new Set(sessions.filter(isActive).map((s) => s.id).filter((id): id is number => id != null))

  const attendanceByStudent = new Map<number, { P: number; A: number; L: number; E: number }>()
  for (const r of records) {
    if (!activeSessionIds.has(r.sessionId)) continue
    let bucket = attendanceByStudent.get(r.studentId)
    if (!bucket) {
      bucket = { P: 0, A: 0, L: 0, E: 0 }
      attendanceByStudent.set(r.studentId, bucket)
    }
    bucket[r.status] += 1
  }

  return activeStudents.map((student) => {
    const sid = student.id ?? -1
    const row = scores[sid] ?? {}

    let sum = 0
    let maxSum = 0
    for (const subject of activeScoreSubjects) {
      if (subject.id == null) continue
      const value = scoreNumber(row[subject.id])
      if (value == null) continue
      sum += value
      maxSum += subject.maxScore
    }
    const average = maxSum > 0 ? Math.round((sum / maxSum) * 1000) / 10 : null

    const att = attendanceByStudent.get(sid)
    const taken = att ? att.P + att.A + att.L + att.E : 0
    const attended = att ? att.P : 0
    const attendancePct = taken > 0 ? Math.round((attended / taken) * 1000) / 10 : null

    return {
      studentId: sid,
      name: student.fullName,
      average,
      attendancePct,
      attended,
      taken,
    }
  })
}
