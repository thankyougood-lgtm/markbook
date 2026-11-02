import { db, type Sex, type StudentRow } from '../schema';

export async function listStudents(classId: number): Promise<StudentRow[]> {
  const rows = await db.students.where('classId').equals(classId).toArray();
  return rows.filter((s) => s.archivedAt === null).sort((a, b) => a.order - b.order);
}

export async function addStudent(
  classId: number,
  input: { fullName: string; sex: Sex; age: number | null }
): Promise<number> {
  const existing = await listStudents(classId);
  const order = existing.length ? Math.max(...existing.map((s) => s.order)) + 1 : 0;
  const serialNo = existing.length ? Math.max(...existing.map((s) => s.serialNo)) + 1 : 1;
  return db.students.add({ classId, serialNo, order, archivedAt: null, ...input } as StudentRow);
}

export async function updateStudent(
  id: number,
  patch: Partial<Pick<StudentRow, 'fullName' | 'sex' | 'age'>>
): Promise<void> {
  await db.students.update(id, patch);
}

export async function archiveStudent(id: number): Promise<void> {
  await db.students.update(id, { archivedAt: Date.now() });
}
