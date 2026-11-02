import { am, en, om } from '../i18n';
import type { Semester, Sex, StudentRow } from '../db/schema';
import { db } from '../db/schema';
import { saveSheetData } from '../db/repositories/sheets';

export interface RosterColumns {
  no: number | null;
  name: number | null;
  sex: number | null;
  age: number | null;
}

export interface RosterRowResult {
  sheetRowKey: string;
  rowIndex: number;
  fullName: string;
  sex: Sex | null;
  age: number | null;
  serialNo: number | null;
  archived: boolean;
  invalidAge: boolean;
}

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();

// Header labels in every supported language, so a sheet typed in Amharic or
// Afan Oromo still maps correctly.
function headerLabels() {
  const label = (key: 'no' | 'name' | 'sex' | 'age') =>
    [en, am, om].map((dict) => norm(dict.sheet[key]));
  return { no: label('no'), name: label('name'), sex: label('sex'), age: label('age') };
}

/** Detect the roster columns in row 1 by header text; null when it is not a roster. */
export function detectRosterColumns(headerRow: unknown[] | undefined): RosterColumns | null {
  if (!headerRow) return null;
  const labels = headerLabels();
  const cols: RosterColumns = { no: null, name: null, sex: null, age: null };
  headerRow.forEach((cell, index) => {
    const text = norm(cell);
    if (!text) return;
    (Object.keys(cols) as (keyof RosterColumns)[]).forEach((key) => {
      if (labels[key].includes(text) && cols[key] === null) cols[key] = index;
    });
  });
  return cols.name === null ? null : cols;
}

export function parseSex(value: unknown): Sex | null {
  const text = norm(value);
  if (text === 'm' || text === 'male') return 'M';
  if (text === 'f' || text === 'female') return 'F';
  return null;
}

/** Whole number 5..30, otherwise null (the cell keeps its text and gets marked). */
export function parseAge(value: unknown): number | null {
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  return n >= 5 && n <= 30 ? n : null;
}

export function parseSerialNo(value: unknown): number | null {
  const text = String(value ?? '').trim();
  return /^\d+$/.test(text) ? Number(text) : null;
}

function newRowKey(): string {
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface PersistSheetParams {
  sheet: { id: number; classId: number; semester: Semester; isStudentList?: boolean };
  values: unknown[][];
  meta: { columns?: RosterColumns; rowKeys?: Record<string, string> } | undefined;
  markInvalid: (cells: { x: number; y: number; message: string }[]) => void;
}

/**
 * The save path used by the Add Record page: sync the roster when the sheet is
 * the student list, then persist values plus metadata in one write.
 */
export async function persistSheet(params: PersistSheetParams) {
  const { sheet, values, markInvalid } = params;
  let meta = params.meta;
  if (sheet.isStudentList) {
    const columns = detectRosterColumns(values[0]);
    if (columns) {
      const synced = await syncRoster({
        classId: sheet.classId,
        semester: sheet.semester,
        values,
        columns,
        rowKeys: meta?.rowKeys ?? {}
      });
      meta = { ...meta, columns, rowKeys: synced.rowKeys };
      if (columns.age !== null) {
        markInvalid(
          synced.invalidAgeRows.map((rowIndex) => ({
            x: columns.age as number,
            y: rowIndex,
            message: 'Age must be 5 to 30'
          }))
        );
      }
    }
  }
  const rowCount = Math.max(values.length, 1);
  const colCount = Math.max(values.reduce((max, row) => Math.max(max, row.length), 0), 1);
  await saveSheetData(sheet.id, values, rowCount, colCount, meta);
  return meta;
}

/**
 * Reconcile the students of one class with the roster sheet.
 *
 * Students are matched by their hidden sheetRowKey, never by name, so renaming
 * a row updates the existing student instead of creating a second one. Missing
 * names and deleted rows archive; nothing is ever deleted.
 */
export async function syncRoster(
  params: {
    classId: number;
    semester: Semester;
    values: unknown[][];
    columns: RosterColumns;
    rowKeys: Record<string, string>;
  }
): Promise<{ rowKeys: Record<string, string>; results: RosterRowResult[]; invalidAgeRows: number[] }> {
  const { classId, values, columns, rowKeys } = params;
  const nextKeys: Record<string, string> = { ...rowKeys };
  const results: RosterRowResult[] = [];
  const invalidAgeRows: number[] = [];

  const existing = await db.students.where('classId').equals(classId).toArray();
  const byKey = new Map(
    existing.filter((s) => s.sheetRowKey).map((s) => [s.sheetRowKey as string, s] as const)
  );

  const nameCol = columns.name as number;
  const seenKeys = new Set<string>();

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex] ?? [];
    const fullName = String(row[nameCol] ?? '').trim();
    const key = nextKeys[String(rowIndex)] ?? (fullName ? newRowKey() : null);

    if (!key) continue;
    nextKeys[String(rowIndex)] = key;

    if (!fullName) {
      const match = byKey.get(key);
      if (match && match.archivedAt === null) {
        await db.students.update(match.id, { archivedAt: Date.now() });
        match.archivedAt = Date.now();
      }
      results.push({
        sheetRowKey: key,
        rowIndex,
        fullName: '',
        sex: null,
        age: null,
        serialNo: null,
        archived: true,
        invalidAge: false
      });
      continue;
    }

    seenKeys.add(key);
    const sex = columns.sex === null ? null : parseSex(row[columns.sex]);
    const rawAge = columns.age === null ? null : row[columns.age];
    const age = columns.age === null ? null : parseAge(rawAge);
    const invalidAge = columns.age !== null && rawAge !== null && rawAge !== undefined && String(rawAge).trim() !== '' && age === null;
    if (invalidAge) invalidAgeRows.push(rowIndex);
    const serialNo = columns.no === null ? null : parseSerialNo(row[columns.no]);

    const match = byKey.get(key) as StudentRow | undefined;
    if (match) {
      await db.students.update(match.id, {
        fullName,
        sex,
        age,
        serialNo: serialNo ?? match.serialNo,
        order: rowIndex,
        archivedAt: null
      });
    } else {
      const id = await db.students.add({
        classId,
        serialNo: serialNo ?? seenKeys.size,
        fullName,
        sex,
        age,
        order: rowIndex,
        archivedAt: null,
        sheetRowKey: key
      } as StudentRow);
      byKey.set(key, (await db.students.get(id)) as StudentRow);
    }

    results.push({ sheetRowKey: key, rowIndex, fullName, sex, age, serialNo, archived: false, invalidAge });
  }

  // Rows that used to hold a student but no longer exist in the sheet.
  for (const [key, student] of byKey) {
    if (seenKeys.has(key) || student.archivedAt !== null) continue;
    const stillListed = Object.values(nextKeys).includes(key) && values.some((_, i) => nextKeys[String(i)] === key && String((values[i] ?? [])[nameCol] ?? '').trim());
    if (!stillListed) await db.students.update(student.id, { archivedAt: Date.now() });
  }

  return { rowKeys: nextKeys, results, invalidAgeRows };
}
