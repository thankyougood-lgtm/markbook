import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { MarkBookDB } from './schema';

// A version-1 database, exactly as v1 created it (no sheetRowKey anywhere).
function openV1(name: string): Dexie {
  const legacy = new Dexie(name);
  legacy.version(1).stores({
    classes: '++id, name, academicYear, schoolName, teacherName, createdAt, archivedAt',
    subjects: '++id, classId, name, maxScore, order, archivedAt',
    students: '++id, classId, serialNo, fullName, sex, age, order, archivedAt',
    studentSemesters: '[studentId+semester], remark',
    scores: '[studentId+semester+subjectId], value',
    attendanceSessions: '++id, classId, date, period, subjectId',
    attendanceRecords: '[sessionId+studentId], status',
    settings: 'key, value'
  });
  return legacy;
}

const opened: MarkBookDB[] = [];

afterEach(async () => {
  for (const d of opened.splice(0)) {
    d.close();
    await Dexie.delete(d.name);
  }
});

describe('schema migrations', () => {
  it('opens a v1 fixture with no data loss and adds sheetRowKey as null', async () => {
    const name = 'fixture-v1';
    const legacy = openV1(name);
    await legacy.open();
    await legacy.table('classes').add({
      name: '11A',
      academicYear: '2018 EC',
      schoolName: 'School',
      teacherName: 'Teacher',
      createdAt: 1700000000000,
      archivedAt: null
    });
    await legacy.table('students').add({
      classId: 1,
      serialNo: 1,
      fullName: 'Abebe',
      sex: 'M',
      age: 16,
      order: 0,
      archivedAt: null
    });
    await legacy.table('scores').put({ studentId: 1, semester: 1, subjectId: 7, value: 47.5 });
    await legacy.table('attendanceSessions').add({ classId: 1, date: '2024-01-02', period: 3, subjectId: 7 });
    await legacy.table('attendanceRecords').put({ sessionId: 1, studentId: 1, status: 'P' });
    legacy.close();

    const upgraded = new MarkBookDB(name);
    opened.push(upgraded);
    await upgraded.open();

    const students = await upgraded.students.toArray();
    expect(students).toHaveLength(1);
    expect(students[0]?.fullName).toBe('Abebe');
    expect(students[0]?.sex).toBe('M');
    expect(students[0]?.age).toBe(16);
    expect(students[0]?.sheetRowKey ?? null).toBeNull();
    expect(await upgraded.scores.count()).toBe(1);
    expect((await upgraded.scores.toArray())[0]?.value).toBe(47.5);
    expect(await upgraded.attendanceRecords.count()).toBe(1);
    expect(await upgraded.classes.count()).toBe(1);

    await upgraded.students.update(students[0]!.id, { sheetRowKey: 'row-abc' });
    expect((await upgraded.students.where('sheetRowKey').equals('row-abc').toArray())[0]?.fullName).toBe('Abebe');
  });
});
