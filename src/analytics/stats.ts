import type { AttendanceRecordRow, AttendanceSessionRow, AttendanceStatus, ScoreRow, Semester, StudentRow, SubjectRow } from '../db/schema';
import { computePercent } from '../attendance/stats';

export interface SubjectAverage {
  id: number;
  name: string;
  average: number | null;
  maxScore: number;
  recorded: number;
}
export interface AttendanceTrend {
  date: string;
  percent: number | null;
  recorded: number;
}
export interface StudentSummary {
  id: number;
  serialNo: number;
  fullName: string;
  sex: StudentRow['sex'];
  total: number | null;
  attendancePercent: number | null;
}
export interface AnalyticsSnapshot {
  students: StudentRow[];
  subjects: SubjectRow[];
  scores: ScoreRow[];
  sessions: AttendanceSessionRow[];
  records: AttendanceRecordRow[];
}
export interface AnalyticsResult {
  subjects: SubjectAverage[];
  statuses: { status: AttendanceStatus; count: number }[];
  trend: AttendanceTrend[];
  summaries: StudentSummary[];
  recordedMarks: number;
  attendancePercent: number | null;
  recordedAttendance: number;
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Pure, blank-safe calculations. A selected subject filters marks AND attendance. */
export function calculateAnalytics(
  data: AnalyticsSnapshot,
  semester: Semester,
  subjectId: number | null = null
): AnalyticsResult {
  const students = data.students.filter((s) => s.archivedAt === null).sort((a, b) => a.order - b.order);
  const activeIds = new Set(students.map((s) => s.id));
  const subjects = data.subjects
    .filter((s) => s.archivedAt === null && (subjectId === null || s.id === subjectId))
    .sort((a, b) => a.order - b.order);
  const subjectIds = new Set(subjects.map((s) => s.id));
  const scores = data.scores.filter((s) =>
    s.semester === semester && activeIds.has(s.studentId) && subjectIds.has(s.subjectId) &&
    s.value !== null && Number.isFinite(s.value)
  );
  const sessions = data.sessions.filter((s) =>
    (s.semester ?? 1) === semester && (subjectId === null || s.subjectId === subjectId)
  );
  const sessionIds = new Set(sessions.map((s) => s.id));
  const records = data.records.filter((r) => sessionIds.has(r.sessionId) && activeIds.has(r.studentId));
  const byDate = new Map(sessions.map((s) => [s.id, s.date]));
  const trendMap = new Map<string, AttendanceStatus[]>();
  const byStudent = new Map<number, AttendanceStatus[]>();
  for (const record of records) {
    const date = byDate.get(record.sessionId);
    if (date) trendMap.set(date, [...(trendMap.get(date) ?? []), record.status]);
    byStudent.set(record.studentId, [...(byStudent.get(record.studentId) ?? []), record.status]);
  }
  const summaries = students.map((student) => {
    const entered = scores.filter((s) => s.studentId === student.id);
    return {
      id: student.id,
      serialNo: student.serialNo,
      fullName: student.fullName,
      sex: student.sex,
      total: entered.length ? round(entered.reduce((sum, s) => sum + (s.value ?? 0), 0)) : null,
      attendancePercent: computePercent(byStudent.get(student.id) ?? [])
    };
  });
  return {
    subjects: subjects.map((subject) => {
      const entered = scores.filter((s) => s.subjectId === subject.id);
      return {
        id: subject.id,
        name: subject.name,
        average: entered.length ? round(entered.reduce((sum, s) => sum + (s.value ?? 0), 0) / entered.length) : null,
        maxScore: subject.maxScore,
        recorded: entered.length
      };
    }),
    statuses: (['P', 'A', 'L', 'E'] as const).map((status) => ({
      status,
      count: records.filter((r) => r.status === status).length
    })),
    trend: [...trendMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, statuses]) => ({
      date,
      percent: computePercent(statuses),
      recorded: statuses.filter((s) => s !== 'E').length
    })),
    summaries,
    recordedMarks: scores.length,
    attendancePercent: computePercent(records.map((r) => r.status)),
    recordedAttendance: records.filter((r) => r.status !== 'E').length
  };
}
