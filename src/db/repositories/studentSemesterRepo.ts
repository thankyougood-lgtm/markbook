import { db, type StudentSemesterRow } from '../db'

export interface StudentSemesterInput {
  studentId: number
  semester: 1 | 2
  remark?: string | null
}

export async function getStudentSemester(studentId: number, semester: 1 | 2): Promise<StudentSemesterRow | null> {
  return (await db.studentSemesters.get([studentId, semester])) ?? null
}

export async function setRemark(input: StudentSemesterInput): Promise<StudentSemesterRow> {
  const current = await getStudentSemester(input.studentId, input.semester)
  const nextRemark = input.remark === '' || input.remark == null ? null : input.remark.trim() === '' ? null : input.remark.trim()

  const record: StudentSemesterRow = {
    studentId: input.studentId,
    semester: input.semester,
    remark: nextRemark,
    conduct: current?.conduct ?? null,
  }

  await db.studentSemesters.put(record)
  return record
}

export async function listRemarksForSemester(classId: number, semester: 1 | 2): Promise<Record<number, string | null>> {
  const allStudents = await db.students.where('classId').equals(classId).toArray()
  const classStudentIds = new Set(
    allStudents.filter((s) => !s.archivedAt).map((s) => s.id as number)
  )

  const allRows = await db.studentSemesters.where('semester').equals(semester).toArray()
  const result: Record<number, string | null> = {}

  for (const row of allRows) {
    if (!classStudentIds.has(row.studentId)) continue
    result[row.studentId] = row.remark ?? null
  }

  return result
}
