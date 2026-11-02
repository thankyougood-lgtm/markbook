import { db, type Semester, type StudentSemesterRow } from '../schema';

export async function getSemesterRecord(studentId: number, semester: Semester): Promise<StudentSemesterRow | undefined> {
  return db.studentSemesters.get([studentId, semester]);
}

export async function setRemark(studentId: number, semester: Semester, remark: string): Promise<void> {
  await db.studentSemesters.put({ studentId, semester, remark });
}
