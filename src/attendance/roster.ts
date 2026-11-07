import type { Semester } from '../db/schema';
import { listSheets, loadSheetData } from '../db/repositories/sheets';
import { listSubjects } from '../db/repositories/subjects';
import { detectRosterColumns } from '../sheet/rosterSync';

const RESERVED = new Set([
  'total',
  'remark',
  'average',
  'rank',
  'conduct',
  'attendance',
  'absents',
  'semester',
  'sem'
]);

const norm = (value: unknown) => String(value ?? '').trim().toLowerCase();

/** Subject headers from a roster row: non-empty cells after Age, minus reserved columns. */
export function subjectColumnsFromHeader(headerRow: unknown[] | undefined): string[] {
  const columns = detectRosterColumns(headerRow);
  if (!columns || !headerRow) return [];
  const start =
    Math.max(columns.no ?? -1, columns.name ?? -1, columns.sex ?? -1, columns.age ?? -1) + 1;
  const names: string[] = [];
  const seen = new Set<string>();
  for (let index = start; index < headerRow.length; index += 1) {
    const text = String(headerRow[index] ?? '').trim();
    const key = norm(text);
    if (!text || RESERVED.has(key) || seen.has(key)) continue;
    seen.add(key);
    names.push(text);
  }
  return names;
}

/** Merge subjects typed in the class roster sheet with subjects already saved for the class. */
export async function listAttendanceSubjects(classId: number, semester: Semester): Promise<string[]> {
  const [sheets, savedSubjects] = await Promise.all([
    listSheets(classId, semester),
    listSubjects(classId)
  ]);
  const studentList = sheets.find((sheet) => sheet.isStudentList);
  const stored = studentList ? await loadSheetData(studentList.id) : undefined;
  const headerRow = Array.isArray(stored?.data) ? (stored?.data[0] as unknown[] | undefined) : undefined;
  const fromRoster = subjectColumnsFromHeader(headerRow);

  const names: string[] = [];
  const seen = new Set<string>();
  for (const name of [...fromRoster, ...savedSubjects.map((subject) => subject.name)]) {
    const text = name.trim();
    const key = norm(text);
    if (!text || seen.has(key)) continue;
    seen.add(key);
    names.push(text);
  }
  return names;
}
