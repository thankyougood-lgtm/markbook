import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MarkBookDB, db } from './schema';
import {
  ROSTER_HEADERS,
  archiveSheet,
  createSheet,
  duplicateSheet,
  listSheets,
  loadSheetData,
  renameSheet,
  saveSheetData
} from './repositories/sheets';

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

const opened: MarkBookDB[] = [];

afterEach(() => {
  for (const d of opened.splice(0)) d.close();
});

describe('sheets repository', () => {
  it('creates sheets in order within one class and semester', async () => {
    const first = await createSheet({ classId: 1, semester: 1 });
    const second = await createSheet({ classId: 1, semester: 1 });
    expect(first.name).toBe('Sheet1');
    expect(second.name).toBe('Sheet2');
    expect(second.order).toBeGreaterThan(first.order);
    expect((await listSheets(1, 1)).map((s) => s.name)).toEqual(['Sheet1', 'Sheet2']);
    expect(await listSheets(1, 2)).toHaveLength(0);
  });

  it('seeds the roster template with the four leading headers', async () => {
    const sheet = await createSheet({ classId: 1, semester: 1, template: 'roster' });
    const data = await loadSheetData(sheet.id);
    expect(data?.data).toEqual([[...ROSTER_HEADERS]]);
    expect(data?.rowCount).toBe(100);
    expect(data?.colCount).toBe(26);
  });

  it('leaves a blank sheet empty', async () => {
    const sheet = await createSheet({ classId: 1, semester: 1 });
    expect((await loadSheetData(sheet.id))?.data).toBeNull();
  });

  it('renames a sheet', async () => {
    const sheet = await createSheet({ classId: 1, semester: 1 });
    await renameSheet(sheet.id, 'Class roster');
    expect((await listSheets(1, 1))[0]?.name).toBe('Class roster');
  });

  it('duplicates a sheet with its data', async () => {
    const sheet = await createSheet({ classId: 1, semester: 1, name: 'Class roster', template: 'roster' });
    await saveSheetData(sheet.id, [['NO']], 120, 30);
    const copy = await duplicateSheet(sheet.id);
    expect(copy.id).not.toBe(sheet.id);
    expect(copy.name).toBe('Class roster copy');
    const data = await loadSheetData(copy.id);
    expect(data?.rowCount).toBe(120);
    expect(data?.colCount).toBe(30);
  });

  it('archives instead of deleting', async () => {
    const sheet = await createSheet({ classId: 1, semester: 1 });
    await archiveSheet(sheet.id);
    expect(await listSheets(1, 1)).toHaveLength(0);
    expect((await db.sheets.get(sheet.id))?.archivedAt).not.toBeNull();
  });

  it('saves and reloads sheet data in one record', async () => {
    const sheet = await createSheet({ classId: 1, semester: 1 });
    await saveSheetData(sheet.id, { cells: [['A1', 'Abebe']] }, 5, 3);
    const data = await loadSheetData(sheet.id);
    expect(data?.data).toEqual({ cells: [['A1', 'Abebe']] });
    expect(await db.sheetData.count()).toBe(1);
  });
});

describe('v2 database upgrade', () => {
  it('opens an existing v2 database and adds empty sheets tables', async () => {
    const name = 'fixture-v2-sheets';
    const legacy = new Dexie(name);
    legacy.version(2).stores({
      classes: '++id, name, academicYear, schoolName, teacherName, createdAt, archivedAt',
      subjects: '++id, classId, name, maxScore, order, archivedAt',
      students: '++id, classId, serialNo, fullName, sex, age, order, archivedAt, sheetRowKey',
      studentSemesters: '[studentId+semester], remark',
      scores: '[studentId+semester+subjectId], value',
      attendanceSessions: '++id, classId, date, period, subjectId',
      attendanceRecords: '[sessionId+studentId], status',
      settings: 'key, value'
    });
    await legacy.open();
    await legacy.table('classes').add({
      name: '11A',
      academicYear: '2018 EC',
      schoolName: 'School',
      teacherName: 'Teacher',
      createdAt: 1700000000000,
      archivedAt: null
    });
    legacy.close();

    const upgraded = new MarkBookDB(name);
    opened.push(upgraded);
    await upgraded.open();

    expect((await upgraded.classes.toArray())[0]?.name).toBe('11A');
    expect(await upgraded.sheets.count()).toBe(0);
    expect(await upgraded.sheetData.count()).toBe(0);
    await upgraded.delete();
  });
});
