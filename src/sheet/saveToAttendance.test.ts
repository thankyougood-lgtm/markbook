import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/schema';
import { createClass } from '../db/repositories/classes';
import { createSheet } from '../db/repositories/sheets';
import { listStudents } from '../db/repositories/students';
import { persistSheet } from './rosterSync';

const HEADER = ['NO', 'Students name', 'Sex', 'Age'];

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

// Drives the exact save path the Add Record page uses (persistSheet), then reads
// the students the Attendance page renders.
describe('page save -> roster sync -> Attendance', () => {
  it('types names on the student list sheet and they reach the students table in order', async () => {
    const cls = await createClass({
      name: '11A',
      academicYear: '2018 EC',
      schoolName: 'S',
      teacherName: 'T'
    });
    const sheet = await createSheet({ classId: cls.id, semester: 1, template: 'roster' });
    const markInvalid = vi.fn();

    await persistSheet({
      sheet,
      meta: undefined,
      markInvalid,
      values: [
        HEADER,
        [1, 'Abebe', 'M', 16],
        [2, 'Sara', 'Female', 15],
        [3, 'Kebede', 'male', 17]
      ]
    });

    const students = await listStudents(cls.id);
    expect(students.map((s) => s.fullName)).toEqual(['Abebe', 'Sara', 'Kebede']);
    expect(students.map((s) => s.sex)).toEqual(['M', 'F', 'M']);
    expect(students.map((s) => s.age)).toEqual([16, 15, 17]);
    expect(students.map((s) => s.order)).toEqual([1, 2, 3]);
    expect(markInvalid).toHaveBeenCalledWith([]);

    // A second save (same values, stored row keys) must not duplicate anyone.
    const stored = await db.sheetData.get(sheet.id);
    await persistSheet({ sheet, meta: stored?.meta, markInvalid, values: [
      HEADER,
      [1, 'Abebe', 'M', 16],
      [2, 'Sara', 'Female', 15],
      [3, 'Kebede', 'male', 17]
    ] });
    expect(await listStudents(cls.id)).toHaveLength(3);
  });

  it('removing a name archives that student and keeps the others in order', async () => {
    const cls = await createClass({
      name: '11A',
      academicYear: '2018 EC',
      schoolName: 'S',
      teacherName: 'T'
    });
    const sheet = await createSheet({ classId: cls.id, semester: 1, template: 'roster' });
    const markInvalid = vi.fn();

    await persistSheet({
      sheet,
      meta: undefined,
      markInvalid,
      values: [HEADER, [1, 'Abebe', 'M', 16], [2, 'Sara', 'F', 15]]
    });
    const stored = await db.sheetData.get(sheet.id);

    await persistSheet({
      sheet,
      meta: stored?.meta,
      markInvalid,
      values: [HEADER, [1, 'Abebe', 'M', 16], [2, '', 'F', 15]]
    });

    const active = await listStudents(cls.id);
    expect(active.map((s) => s.fullName)).toEqual(['Abebe']);
    expect(active[0]?.order).toBe(1);
    expect(await db.students.count()).toBe(2);
  });
});
