import { db, type SubjectRow } from '../schema';

export async function listSubjects(classId: number): Promise<SubjectRow[]> {
  const rows = await db.subjects.where('classId').equals(classId).toArray();
  return rows.filter((s) => s.archivedAt === null).sort((a, b) => a.order - b.order);
}

export async function addSubject(classId: number, name: string, maxScore = 100): Promise<number> {
  const existing = await listSubjects(classId);
  const order = existing.length ? Math.max(...existing.map((s) => s.order)) + 1 : 0;
  return db.subjects.add({ classId, name, maxScore, order, archivedAt: null } as SubjectRow);
}

export async function updateSubject(id: number, patch: Partial<Pick<SubjectRow, 'name' | 'maxScore'>>): Promise<void> {
  await db.subjects.update(id, patch);
}

export async function archiveSubject(id: number): Promise<void> {
  await db.subjects.update(id, { archivedAt: Date.now() });
}
