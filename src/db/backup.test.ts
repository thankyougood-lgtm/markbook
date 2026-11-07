import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './schema';
import { BACKUP_TABLES, backupCounts, createBackup, restoreBackup, validateBackup, type BackupPreferences } from './repositories/backup';
import { createClass } from './repositories/classes';
import { addStudent, archiveStudent } from './repositories/students';
import { addSubject } from './repositories/subjects';
import { setScore } from './repositories/scores';
import { getOrCreateSession, setRecord } from './repositories/attendance';
import { createSheet, saveSheetData } from './repositories/sheets';
import { setSetting } from './repositories/settings';

const preferences: BackupPreferences = { language: 'om', theme: 'dark', classId: null, semester: 2 };
beforeEach(async () => { await Promise.all(db.tables.map((t) => t.clear())); });

async function seed() {
  const cls = await createClass({ name: '11A', academicYear: '2018 EC', schoolName: 'School', teacherName: 'Teacher' });
  const student = await addStudent(cls.id, { fullName: 'Abebe', sex: 'M', age: 16 });
  const archived = await addStudent(cls.id, { fullName: 'Archived', sex: null, age: null });
  await archiveStudent(archived);
  const subject = await addSubject(cls.id, 'Maths');
  await setScore(student, 1, subject, 85);
  const session = await getOrCreateSession(cls.id, '2026-11-07', 1, subject, 1);
  await setRecord(session, student, 'P');
  const sheet = await createSheet({ classId: cls.id, semester: 1, template: 'roster' });
  await saveSheetData(sheet.id, [['NO', 'Students name'], ['1', 'Abebe']], 2, 2, { rowKeys: { '1': 'row-1' } });
  await setSetting('custom', { enabled: true });
  return { ...preferences, classId: cls.id };
}

describe('backup and restore', () => {
  it('round-trips every table, archived rows, sheet metadata and preferences', async () => {
    const prefs = await seed();
    const backup = await createBackup(prefs);
    const json = JSON.stringify(backup);
    expect(backupCounts(backup).filter((t) => t.name !== 'studentSemesters').every((t) => t.count > 0)).toBe(true);
    await db.classes.clear();
    await restoreBackup(JSON.parse(json));
    expect(await createBackup(prefs)).toMatchObject({ tables: backup.tables, preferences: prefs });
    expect((await db.students.toArray()).some((s) => s.archivedAt !== null)).toBe(true);
    expect((await db.sheetData.get(1))?.meta?.rowKeys?.['1']).toBe('row-1');
  });
  it('rejects malformed, incomplete, future-format and duplicate-key files without changing data', async () => {
    const prefs = await seed();
    const before = await createBackup(prefs);
    const invalid: unknown[] = [null, {}, { ...before, formatVersion: 2 }, { ...before, databaseVersion: 999 }, { ...before, tables: { ...before.tables, students: [] } }, { ...before, tables: { ...before.tables, scores: [...before.tables.scores, ...before.tables.scores] } }, { ...before, tables: { ...before.tables, extra: [] } }];
    for (const value of invalid) {
      expect(() => validateBackup(value)).toThrow();
      await expect(restoreBackup(value)).rejects.toThrow();
    }
    expect((await createBackup(prefs)).tables).toEqual(before.tables);
  });
  it('rejects broken relationships and invalid status/period values', async () => {
    const backup = await createBackup(await seed());
    const orphan = structuredClone(backup);
    orphan.tables.subjects[0]!.classId = 999;
    expect(() => validateBackup(orphan)).toThrow();
    const status = structuredClone(backup);
    (status.tables.attendanceRecords[0] as { status: string }).status = 'X';
    expect(() => validateBackup(status)).toThrow();
    const period = structuredClone(backup);
    period.tables.attendanceSessions[0]!.period = 9;
    expect(() => validateBackup(period)).toThrow();
  });
  it('rolls back all tables if a restore write fails', async () => {
    const prefs = await seed();
    const before = await createBackup(prefs);
    const replacement = structuredClone(before);
    replacement.tables.classes[0]!.name = 'Replacement';
    const error = new Error('disk full');
    const originalTable = db.table.bind(db);
    const spy = vi.spyOn(db, 'table').mockImplementation(((name: string) => {
      const table = originalTable(name);
      if (name === 'sheetData') return new Proxy(table, { get(target, prop) { return prop === 'bulkAdd' ? () => Promise.reject(error) : Reflect.get(target, prop); } });
      return table;
    }) as typeof db.table);
    await expect(restoreBackup(replacement)).rejects.toThrow('disk full');
    spy.mockRestore();
    expect((await createBackup(prefs)).tables).toEqual(before.tables);
  });
  it('exports the exact table list and restores an intentionally empty backup', async () => {
    await seed();
    const empty = await createBackup(preferences);
    for (const name of BACKUP_TABLES) empty.tables[name] = [] as never;
    await restoreBackup(empty);
    for (const name of BACKUP_TABLES) expect(await db.table(name).count()).toBe(0);
  });
});
