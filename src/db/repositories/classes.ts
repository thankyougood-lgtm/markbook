import { db, type ClassRow } from '../schema';

export interface NewClassInput {
  name: string;
  grade?: string;
  section?: string;
  academicYear: string;
  schoolName: string;
  teacherName: string;
}

export async function listClasses(): Promise<ClassRow[]> {
  const rows = await db.classes.orderBy('createdAt').toArray();
  return rows.filter((c) => c.archivedAt === null);
}

export async function getClass(id: number): Promise<ClassRow | undefined> {
  return db.classes.get(id);
}

export async function createClass(input: NewClassInput): Promise<ClassRow> {
  const id = await db.classes.add({
    ...input,
    createdAt: Date.now(),
    archivedAt: null
  } as ClassRow);
  return (await db.classes.get(id)) as ClassRow;
}

export async function archiveClass(id: number): Promise<void> {
  await db.classes.update(id, { archivedAt: Date.now() });
}
