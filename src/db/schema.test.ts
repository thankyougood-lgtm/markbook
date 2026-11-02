import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './schema';
import { createClass, listClasses } from './repositories/classes';
import { addStudent } from './repositories/students';
import { addSubject, listSubjects } from './repositories/subjects';
import { setScore, getScoresForStudent } from './repositories/scores';

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('schema and repositories', () => {
  it('creates and lists classes', async () => {
    const cls = await createClass({ name: '11A', academicYear: '2018 EC', schoolName: 'S', teacherName: 'T' });
    expect(cls.id).toBeGreaterThan(0);
    expect(await db.classes.toArray()).toHaveLength(1);
    expect(await listClasses()).toHaveLength(1);
  });

  it('round-trips students, subjects and scores with composite keys', async () => {
    const cls = await createClass({ name: '11A', academicYear: '2018 EC', schoolName: 'S', teacherName: 'T' });
    const sid = await addStudent(cls.id, { fullName: 'Abebe', sex: 'M', age: 16 });
    const subjId = await addSubject(cls.id, 'Maths');
    await setScore(sid, 1, subjId, 47.5);
    await setScore(sid, 1, subjId, 49);
    const scores = await getScoresForStudent(sid, 1);
    expect(scores).toHaveLength(1);
    expect(scores[0]?.value).toBe(49);
    await setScore(sid, 1, subjId, null);
    expect((await getScoresForStudent(sid, 1))[0]?.value).toBeNull();
  });

  it('archives instead of deleting', async () => {
    const cls = await createClass({ name: '11B', academicYear: '2018 EC', schoolName: 'S', teacherName: 'T' });
    const sid = await addStudent(cls.id, { fullName: 'Sara', sex: 'F', age: 15 });
    const subj = await addSubject(cls.id, 'English');
    await db.students.update(sid, { archivedAt: Date.now() });
    await db.subjects.update(subj, { archivedAt: Date.now() });
    expect((await db.students.get(sid))?.archivedAt).not.toBeNull();
    expect(await listSubjects(cls.id)).toHaveLength(0);
  });
});
