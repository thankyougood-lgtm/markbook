import { db, type Semester, type ScoreRow } from '../schema';

export async function getScoresForStudent(studentId: number, semester: Semester): Promise<ScoreRow[]> {
  return db.scores.filter((s) => s.studentId === studentId && s.semester === semester).toArray();
}

export async function getScoresForClassStudents(studentIds: number[], semester: Semester): Promise<ScoreRow[]> {
  if (studentIds.length === 0) return [];
  const ids = new Set(studentIds);
  return db.scores.filter((s) => s.semester === semester && ids.has(s.studentId)).toArray();
}

export async function setScore(
  studentId: number,
  semester: Semester,
  subjectId: number,
  value: number | null
): Promise<void> {
  await db.scores.put({ studentId, semester, subjectId, value });
}
