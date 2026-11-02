import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/schema';
import { createClass } from '../../db/repositories/classes';
import { addStudent, listStudents } from '../../db/repositories/students';
import { addSubject } from '../../db/repositories/subjects';
import { getScoresForStudent, setScore } from '../../db/repositories/scores';
import { calcTotal } from '../../lib/grid';
import { buildRows } from './model';

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

async function seedClass(): Promise<{ classId: number; subjectId: number }> {
  const cls = await createClass({ name: '11A', academicYear: '2018 EC', schoolName: 'S', teacherName: 'T' });
  const subjectId = await addSubject(cls.id, 'Maths');
  return { classId: cls.id, subjectId };
}

describe('typing in an empty row', () => {
  it('typing a name creates exactly one student with the row number as serialNo', async () => {
    const { classId } = await seedClass();
    const rows = buildRows([], 25);
    const target = rows[4];
    expect(target?.studentId).toBeNull();
    await addStudent(classId, {
      fullName: 'Abebe',
      sex: null,
      age: null,
      serialNo: target!.serialNo,
      order: target!.serialNo - 1
    });
    const students = await listStudents(classId);
    expect(students).toHaveLength(1);
    expect(students[0]?.fullName).toBe('Abebe');
    expect(students[0]?.serialNo).toBe(5);
    expect(students[0]?.order).toBe(4);
  });

  it('never saves an empty row', async () => {
    const { classId } = await seedClass();
    const rows = buildRows([], 25);
    expect(rows).toHaveLength(25);
    expect(rows.every((r) => r.studentId === null)).toBe(true);
    expect(await listStudents(classId)).toHaveLength(0);
  });

  it('a blank score is not zero and is ignored by Total', async () => {
    const { classId, subjectId } = await seedClass();
    const studentId = await addStudent(classId, { fullName: 'Sara', sex: 'F', age: 15 });
    await setScore(studentId, 1, subjectId, null);
    const scores = await getScoresForStudent(studentId, 1);
    expect(scores[0]?.value).toBeNull();
    const total = calcTotal(scores.map((s) => s.value));
    expect(total).toBeNull();
    expect(total).not.toBe(0);
    await setScore(studentId, 1, subjectId, 0);
    expect(calcTotal((await getScoresForStudent(studentId, 1)).map((s) => s.value))).toBe(0);
  });
});
