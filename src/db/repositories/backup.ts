import { db } from '../schema';
import type { ClassRow, SubjectRow, StudentRow, StudentSemesterRow, ScoreRow, AttendanceSessionRow, AttendanceRecordRow, SettingRow, SheetRow, SheetDataRow } from '../schema';

export const BACKUP_TABLES = [
  'classes', 'subjects', 'students', 'studentSemesters', 'scores',
  'attendanceSessions', 'attendanceRecords', 'settings', 'sheets', 'sheetData'
] as const;
export type BackupTableName = typeof BACKUP_TABLES[number];
export interface BackupPreferences {
  language: 'en' | 'am' | 'om';
  theme: 'light' | 'dark';
  classId: number | null;
  semester: 1 | 2;
}
export interface BackupTables {
  classes: ClassRow[];
  subjects: SubjectRow[];
  students: StudentRow[];
  studentSemesters: StudentSemesterRow[];
  scores: ScoreRow[];
  attendanceSessions: AttendanceSessionRow[];
  attendanceRecords: AttendanceRecordRow[];
  settings: SettingRow[];
  sheets: SheetRow[];
  sheetData: SheetDataRow[];
}
export interface Backup {
  format: 'markbook-backup';
  formatVersion: 1;
  databaseVersion: number;
  exportedAt: string;
  tables: BackupTables;
  preferences: BackupPreferences;
}

type Row = Record<string, unknown>;
const object = (v: unknown): v is Row => v !== null && typeof v === 'object' && !Array.isArray(v);
const string = (v: unknown): v is string => typeof v === 'string';
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const id = (v: unknown): v is number => finite(v) && Number.isSafeInteger(v) && v > 0;
const nullableTime = (v: unknown) => v === null || finite(v);
const semester = (v: unknown) => v === 1 || v === 2;
const optional = (v: unknown, check: (v: unknown) => boolean) => v === undefined || check(v);
const fail = (message: string): never => { throw new Error(message); };

const validators: Record<BackupTableName, (r: Row) => boolean> = {
  classes: (r) => id(r.id) && string(r.name) && string(r.academicYear) && string(r.schoolName) && string(r.teacherName) && finite(r.createdAt) && nullableTime(r.archivedAt) && optional(r.grade, string) && optional(r.section, string),
  subjects: (r) => id(r.id) && id(r.classId) && string(r.name) && finite(r.maxScore) && r.maxScore as number > 0 && finite(r.order) && nullableTime(r.archivedAt),
  students: (r) => id(r.id) && id(r.classId) && finite(r.serialNo) && string(r.fullName) && (r.sex === null || r.sex === 'M' || r.sex === 'F') && (r.age === null || finite(r.age)) && finite(r.order) && nullableTime(r.archivedAt) && optional(r.sheetRowKey, (v) => v === null || string(v)),
  studentSemesters: (r) => id(r.studentId) && semester(r.semester) && string(r.remark),
  scores: (r) => id(r.studentId) && semester(r.semester) && id(r.subjectId) && (r.value === null || (finite(r.value) && (r.value as number) >= 0)),
  attendanceSessions: (r) => id(r.id) && id(r.classId) && string(r.date) && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && finite(r.period) && Number.isInteger(r.period) && (r.period as number) >= 1 && (r.period as number) <= 8 && (r.subjectId === null || id(r.subjectId)) && optional(r.semester, semester),
  attendanceRecords: (r) => id(r.sessionId) && id(r.studentId) && ['P', 'A', 'L', 'E'].includes(r.status as string),
  settings: (r) => string(r.key) && r.key.length > 0 && 'value' in r,
  sheets: (r) => id(r.id) && id(r.classId) && semester(r.semester) && string(r.name) && finite(r.order) && (r.template === 'blank' || r.template === 'roster') && finite(r.createdAt) && nullableTime(r.archivedAt) && optional(r.isStudentList, (v) => typeof v === 'boolean'),
  sheetData: (r) => id(r.sheetId) && 'data' in r && id(r.rowCount) && id(r.colCount) && finite(r.updatedAt) && optional(r.meta, (v) => object(v) && optional(v.columns, (c) => object(c) && ['no', 'name', 'sex', 'age'].every((key) => c[key] === null || (finite(c[key]) && Number.isInteger(c[key]) && (c[key] as number) >= 0))) && optional(v.rowKeys, (keys) => object(keys) && Object.values(keys).every(string)))
};

const keyFields: Record<BackupTableName, string[]> = {
  classes: ['id'], subjects: ['id'], students: ['id'], studentSemesters: ['studentId', 'semester'],
  scores: ['studentId', 'semester', 'subjectId'], attendanceSessions: ['id'],
  attendanceRecords: ['sessionId', 'studentId'], settings: ['key'], sheets: ['id'], sheetData: ['sheetId']
};

/** Validate the entire file before touching current data. Unknown formats fail closed. */
export function validateBackup(value: unknown): Backup {
  if (!object(value) || value.format !== 'markbook-backup' || value.formatVersion !== 1) fail('Unsupported backup format');
  const b = value as unknown as Backup;
  if (!id(b.databaseVersion) || b.databaseVersion > db.verno) fail('Unsupported database version');
  if (!string(b.exportedAt) || !Number.isFinite(Date.parse(b.exportedAt))) fail('Invalid export date');
  if (!object(b.tables) || Object.keys(b.tables).sort().join(',') !== [...BACKUP_TABLES].sort().join(',')) fail('Missing or unknown tables');
  if (!object(b.preferences) || !['en', 'am', 'om'].includes(b.preferences.language) || !['light', 'dark'].includes(b.preferences.theme) || !(b.preferences.classId === null || id(b.preferences.classId)) || !semester(b.preferences.semester)) fail('Invalid preferences');
  for (const name of BACKUP_TABLES) {
    const rows = b.tables[name];
    if (!Array.isArray(rows)) fail(`Invalid table: ${name}`);
    const keys = new Set<string>();
    for (const row of rows as unknown[]) {
      if (!object(row)) fail(`Invalid row in ${name}`);
      const validRow = row as Row;
      if (!validators[name](validRow)) fail(`Invalid row in ${name}`);
      const key = JSON.stringify(keyFields[name].map((field) => validRow[field]));
      if (keys.has(key)) fail(`Duplicate key in ${name}`);
      keys.add(key);
    }
  }
  // Reject broken relationships rather than silently importing orphaned records.
  const ids = (name: 'classes' | 'subjects' | 'students' | 'attendanceSessions' | 'sheets') => new Set(b.tables[name].map((r) => r.id));
  const classIds = ids('classes'), subjectIds = ids('subjects'), studentIds = ids('students'), sessionIds = ids('attendanceSessions'), sheetIds = ids('sheets');
  const belongs = (condition: boolean) => { if (!condition) fail('Broken record relationship'); };
  for (const r of b.tables.subjects) belongs(classIds.has(r.classId));
  for (const r of b.tables.students) belongs(classIds.has(r.classId));
  for (const r of b.tables.studentSemesters) belongs(studentIds.has(r.studentId));
  for (const r of b.tables.scores) belongs(studentIds.has(r.studentId) && subjectIds.has(r.subjectId));
  for (const r of b.tables.attendanceSessions) belongs(classIds.has(r.classId) && (r.subjectId === null || subjectIds.has(r.subjectId)));
  for (const r of b.tables.attendanceRecords) belongs(sessionIds.has(r.sessionId) && studentIds.has(r.studentId));
  for (const r of b.tables.sheets) belongs(classIds.has(r.classId));
  for (const r of b.tables.sheetData) belongs(sheetIds.has(r.sheetId));
  if (b.preferences.classId !== null) belongs(classIds.has(b.preferences.classId));
  return b;
}

/** Consistent read snapshot, including archived rows and spreadsheet data. */
export async function createBackup(preferences: BackupPreferences): Promise<Backup> {
  return db.transaction('r', db.tables, async () => {
    const tables = {} as BackupTables;
    for (const name of BACKUP_TABLES) {
      (tables as Record<BackupTableName, unknown[]>)[name] = await db.table(name).toArray();
    }
    return {
      format: 'markbook-backup', formatVersion: 1, databaseVersion: db.verno,
      exportedAt: new Date().toISOString(), tables, preferences
    };
  });
}

/** Atomic replace. Validation runs first; any write failure rolls back every table. */
export async function restoreBackup(value: unknown): Promise<void> {
  const backup = validateBackup(value);
  await db.transaction('rw', db.tables, async () => {
    for (const name of BACKUP_TABLES) {
      const table = db.table(name);
      await table.clear();
      const rows = backup.tables[name];
      if (rows.length) await table.bulkAdd(rows);
    }
  });
}

export function backupCounts(backup: Backup): { name: BackupTableName; count: number }[] {
  return BACKUP_TABLES.map((name) => ({ name, count: backup.tables[name].length }));
}
