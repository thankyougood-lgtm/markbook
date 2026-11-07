import type { Semester } from '../db/schema';
import { listStudents } from '../db/repositories/students';
import { listSubjects } from '../db/repositories/subjects';
import { getScoresForClassStudents } from '../db/repositories/scores';
import { listRecordsForClass, listSessionsForClass } from '../db/repositories/attendance';
import type { AnalyticsSnapshot } from './stats';

/** Pages use repositories only; no direct IndexedDB queries in components. */
export async function loadAnalytics(classId: number, semester: Semester): Promise<AnalyticsSnapshot> {
  const [students, subjects, sessions, records] = await Promise.all([
    listStudents(classId), listSubjects(classId),
    listSessionsForClass(classId, semester), listRecordsForClass(classId, semester)
  ]);
  const scores = await getScoresForClassStudents(students.map((s) => s.id), semester);
  return { students, subjects, scores, sessions, records };
}
