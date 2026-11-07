import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/schema';
import { createClass } from '../db/repositories/classes';
import { createSheet, saveSheetData, setStudentList } from '../db/repositories/sheets';
import { addSubject } from '../db/repositories/subjects';
import { listAttendanceSubjects, subjectColumnsFromHeader } from './roster';

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('attendance roster subjects', () => {
  it('reads subject headers after the fixed roster columns and skips reserved columns', () => {
    expect(
      subjectColumnsFromHeader(['NO', 'Students name', 'Sex', 'Age', 'Maths', 'English', 'Total', 'Remark', 'maths'])
    ).toEqual(['Maths', 'English']);
    expect(subjectColumnsFromHeader(['NO', 'Students name', 'Sex', 'Age'])).toEqual([]);
    expect(subjectColumnsFromHeader(undefined)).toEqual([]);
  });

  it('merges roster subjects with saved subjects for the selected class and semester', async () => {
    const cls = await createClass({ name: '11A', academicYear: '2018 EC', schoolName: 'S', teacherName: 'T' });
    const sheet = await createSheet({ classId: cls.id, semester: 1, template: 'roster' });
    await setStudentList(sheet.id);
    await saveSheetData(sheet.id, [['NO', 'Students name', 'Sex', 'Age', 'Maths', 'Physics', 'Total']], 1, 7);
    await addSubject(cls.id, 'English');
    await addSubject(cls.id, 'maths');

    expect(await listAttendanceSubjects(cls.id, 1)).toEqual(['Maths', 'Physics', 'English']);
    expect(await listAttendanceSubjects(cls.id, 2)).toEqual(['English', 'maths']);
  });
});
