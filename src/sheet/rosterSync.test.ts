import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/schema';
import { listStudents } from '../db/repositories/students';
import { createSheet, loadSheetData, saveSheetData } from '../db/repositories/sheets';
import {
  detectRosterColumns,
  parseAge,
  parseSex,
  syncRoster
} from './rosterSync';

const HEADER = ['NO', 'Students name', 'Sex', 'Age'];

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

async function run(values: unknown[][], rowKeys: Record<string, string> = {}) {
  const columns = detectRosterColumns(values[0])!;
  return syncRoster({ classId: 1, semester: 1, values, columns, rowKeys });
}

describe('roster header detection', () => {
  it('maps the English headers', () => {
    expect(detectRosterColumns(HEADER)).toEqual({ no: 0, name: 1, sex: 2, age: 3 });
  });

  it('maps Amharic and Afan Oromo headers', () => {
    expect(detectRosterColumns(['ቁጥር', 'የተማሪ ስም', 'ጾታ', 'ዕድሜ'])).toEqual({
      no: 0,
      name: 1,
      sex: 2,
      age: 3
    });
    expect(detectRosterColumns(['Lakkoofsa', 'Maqaa barattootaa', 'Saala', 'Umurii'])).toEqual({
      no: 0,
      name: 1,
      sex: 2,
      age: 3
    });
  });

  it('returns null when there is no name column', () => {
    expect(detectRosterColumns(['NO', 'Something'])).toBeNull();
  });
});

describe('cell parsing', () => {
  it('accepts sex in any case', () => {
    expect(parseSex('m')).toBe('M');
    expect(parseSex('Male')).toBe('M');
    expect(parseSex('FEMALE')).toBe('F');
    expect(parseSex('x')).toBeNull();
  });

  it('accepts whole numbers 5 to 30 only', () => {
    expect(parseAge('16')).toBe(16);
    expect(parseAge('5')).toBe(5);
    expect(parseAge('30')).toBe(30);
    expect(parseAge('4')).toBeNull();
    expect(parseAge('31')).toBeNull();
    expect(parseAge('16.5')).toBeNull();
    expect(parseAge('')).toBeNull();
  });
});

describe('syncRoster', () => {
  it('creates three students in row order', async () => {
    const { rowKeys } = await run([
      HEADER,
      [1, 'Abebe', 'M', 16],
      [2, 'Sara', 'F', 15],
      [3, 'Kebede', 'male', 'twenty']
    ]);

    const students = await listStudents(1);
    expect(students.map((s) => s.fullName)).toEqual(['Abebe', 'Sara', 'Kebede']);
    expect(students.map((s) => s.serialNo)).toEqual([1, 2, 3]);
    expect(students.map((s) => s.order)).toEqual([1, 2, 3]);
    expect(students[0]?.sex).toBe('M');
    expect(students[1]?.sex).toBe('F');
    expect(students[2]?.sex).toBe('M');
    expect(students[2]?.age).toBeNull();
    expect(Object.keys(rowKeys)).toHaveLength(3);
  });

  it('updates a renamed row instead of duplicating it', async () => {
    const first = await run([HEADER, [1, 'Abebe', 'M', 16]]);
    await run([HEADER, [1, 'Abebe Bikila', 'M', 16]], first.rowKeys);

    const students = await listStudents(1);
    expect(students).toHaveLength(1);
    expect(students[0]?.fullName).toBe('Abebe Bikila');
  });

  it('archives a student whose name is cleared', async () => {
    const first = await run([HEADER, [1, 'Abebe', 'M', 16], [2, 'Sara', 'F', 15]]);
    await run([HEADER, [1, '', 'M', 16], [2, 'Sara', 'F', 15]], first.rowKeys);

    const active = await listStudents(1);
    expect(active.map((s) => s.fullName)).toEqual(['Sara']);
    const all = await db.students.toArray();
    expect(all).toHaveLength(2);
    expect(all.find((s) => s.fullName === 'Abebe')?.archivedAt).not.toBeNull();
  });

  it('archives a student whose row was deleted', async () => {
    const first = await run([HEADER, [1, 'Abebe', 'M', 16], [2, 'Sara', 'F', 15]]);
    await run([HEADER, [2, 'Sara', 'F', 15]], first.rowKeys);

    const all = await db.students.toArray();
    expect(all).toHaveLength(2);
    expect(all.find((s) => s.fullName === 'Abebe')?.archivedAt).not.toBeNull();
  });

  it('keeps the same students after a reload with the stored row keys', async () => {
    const first = await run([HEADER, [1, 'Abebe', 'M', 16], [2, 'Sara', 'F', 15]]);
    await run([HEADER, [1, 'Abebe', 'M', 16], [2, 'Sara', 'F', 15]], first.rowKeys);

    const students = await listStudents(1);
    expect(students).toHaveLength(2);
    expect(students.map((s) => s.sheetRowKey)).toEqual([
      first.rowKeys['1'],
      first.rowKeys['2']
    ]);
  });

  it('keeps synced students when the sheet is saved and reloaded through the repository', async () => {
    const first = await run([HEADER, [1, 'Abebe', 'M', 16]]);
    const sheet = await createSheet({ classId: 1, semester: 1, template: 'roster' });
    await saveSheetData(sheet.id, [HEADER, [1, 'Abebe', 'M', 16]], 2, 4, {
      columns: detectRosterColumns(HEADER)!,
      rowKeys: first.rowKeys
    });

    const stored = await loadSheetData(sheet.id);
    expect(stored?.meta?.rowKeys).toEqual(first.rowKeys);
    const reloaded = await syncRoster({
      classId: 1,
      semester: 1,
      values: stored?.data as unknown[][],
      columns: stored!.meta!.columns!,
      rowKeys: stored!.meta!.rowKeys!
    });
    expect(Object.values(reloaded.rowKeys)).toEqual(Object.values(first.rowKeys));
    expect(await listStudents(1)).toHaveLength(1);
  });

  it('flags an age outside 5 to 30 without erasing the cell', async () => {
    const result = await run([HEADER, [1, 'Abebe', 'M', 44]]);
    expect(result.invalidAgeRows).toEqual([1]);
    const [student] = await listStudents(1);
    expect(student?.age).toBeNull();
  });
});
