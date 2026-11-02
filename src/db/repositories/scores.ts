import { db, type Semester, type ScoreRow } from '../schema';

export async function getScoresForStudent(studentId: number, semester: Semester): Promise<ScoreRow[]> {
  return db.scores.where('[studentId+semester+subjectId]').between([studentId, semester, -Infinity], [studentId, semester, Infinity]).toArray();
}

export async function getScoresForClassStudents(studentIds: number[], semester: Semester): Promise<ScoreRow[]> {
  if (studentIds.length === 0) return [];
  return db.scores.where('studentId').anyOf(studentIds).and((s) => s.semester === semester).toArray();
}

export async function setScore(
  studentId: number,
  semester: Semester,
  subjectId: number,
  value: number | null
): Promise<void> {
  await db.scores.put({ studentId, semester, subjectId, value });
}
