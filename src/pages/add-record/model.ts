import type { StudentRow, SubjectRow } from '../../db/schema';

export const INITIAL_BLANK_ROWS = 25;
export const EXTRA_BLANK_ROWS = 10;

export type ColKind = 'no' | 'name' | 'sex' | 'age' | 'subject' | 'total' | 'remark' | 'addSubject';

export interface GridCol {
  key: string;
  kind: ColKind;
  label: string;
  subjectId?: number;
  max?: number;
}

export interface GridRow {
  studentId: number | null;
  serialNo: number;
  student: StudentRow | null;
}

export function buildColumns(subjects: SubjectRow[]): GridCol[] {
  return [
    { key: 'no', kind: 'no', label: 'NO' },
    { key: 'name', kind: 'name', label: 'name' },
    { key: 'sex', kind: 'sex', label: 'sex' },
    { key: 'age', kind: 'age', label: 'age' },
    ...subjects.map<GridCol>((s) => ({
      key: `s${s.id}`,
      kind: 'subject',
      label: s.name,
      subjectId: s.id,
      max: s.maxScore
    })),
    { key: 'total', kind: 'total', label: 'total' },
    { key: 'remark', kind: 'remark', label: 'remark' },
    { key: 'addSubject', kind: 'addSubject', label: '+' }
  ];
}

/** Saved students in order, followed by blank display rows (never persisted). */
export function buildRows(students: StudentRow[], blankRows: number): GridRow[] {
  const saved = students.map<GridRow>((s, i) => ({
    studentId: s.id,
    serialNo: i + 1,
    student: s
  }));
  const blanks = Array.from({ length: blankRows }, (_, i) => ({
    studentId: null as number | null,
    serialNo: students.length + i + 1,
    student: null
  }));
  return [...saved, ...blanks];
}

export function scoreKey(studentId: number, subjectId: number): string {
  return `${studentId}:${subjectId}`;
}

/** Excel / WhatsApp paste: tab-separated columns, newline-separated rows. */
export function parseTsv(text: string): string[][] {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
  if (normalized === '') return [];
  return normalized.split('\n').map((line) => line.split('\t'));
}

/** 'm'/'M' -> M, 'f'/'F' -> F, '' -> null, anything else -> undefined (invalid). */
export function parseSex(raw: string): 'M' | 'F' | null | undefined {
  const v = raw.trim().toLowerCase();
  if (v === '') return null;
  if (v === 'm' || v === 'male') return 'M';
  if (v === 'f' || v === 'female') return 'F';
  return undefined;
}

export function isEditableCol(col: GridCol): boolean {
  return col.kind === 'name' || col.kind === 'sex' || col.kind === 'age' || col.kind === 'subject' || col.kind === 'remark';
}
