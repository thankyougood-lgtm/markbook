import Dexie, { type EntityTable } from 'dexie';

export type Semester = 1 | 2;
export type Sex = 'M' | 'F';
export type AttendanceStatus = 'P' | 'A' | 'L' | 'E';

export interface ClassRow {
  id: number;
  name: string;
  grade?: string;
  section?: string;
  academicYear: string;
  schoolName: string;
  teacherName: string;
  createdAt: number;
  archivedAt: number | null;
}

export interface SubjectRow {
  id: number;
  classId: number;
  name: string;
  maxScore: number;
  order: number;
  archivedAt: number | null;
}

export interface StudentRow {
  id: number;
  classId: number;
  serialNo: number;
  fullName: string;
  sex: Sex | null;
  age: number | null;
  order: number;
  archivedAt: number | null;
  sheetRowKey?: string | null;
}

export interface StudentSemesterRow {
  studentId: number;
  semester: Semester;
  remark: string;
}

export interface ScoreRow {
  studentId: number;
  semester: Semester;
  subjectId: number;
  value: number | null;
}

export interface AttendanceSessionRow {
  id: number;
  classId: number;
  date: string;
  period: number;
  subjectId: number | null;
}

export interface AttendanceRecordRow {
  sessionId: number;
  studentId: number;
  status: AttendanceStatus;
}

export interface SettingRow {
  key: string;
  value: unknown;
}

export type SheetTemplate = 'blank' | 'roster';

export interface SheetRow {
  id: number;
  classId: number;
  semester: Semester;
  name: string;
  order: number;
  template: SheetTemplate;
  createdAt: number;
  archivedAt: number | null;
}

// One record per sheet: the whole grid from the spreadsheet library plus its
// dimensions, so a big sheet saves in a single write.
export interface SheetDataRow {
  sheetId: number;
  data: unknown;
  rowCount: number;
  colCount: number;
  updatedAt: number;
}

export class MarkBookDB extends Dexie {
  classes!: EntityTable<ClassRow, 'id'>;
  subjects!: EntityTable<SubjectRow, 'id'>;
  students!: EntityTable<StudentRow, 'id'>;
  studentSemesters!: EntityTable<StudentSemesterRow, 'studentId'>;
  scores!: EntityTable<ScoreRow, 'studentId'>;
  attendanceSessions!: EntityTable<AttendanceSessionRow, 'id'>;
  attendanceRecords!: EntityTable<AttendanceRecordRow, 'sessionId'>;
  settings!: EntityTable<SettingRow, 'key'>;
  sheets!: EntityTable<SheetRow, 'id'>;
  sheetData!: EntityTable<SheetDataRow, 'sheetId'>;

  constructor(name = 'markbook') {
    super(name);
    // Version numbers only increase. Never edit this block.
    this.version(1).stores({
      classes: '++id, name, academicYear, schoolName, teacherName, createdAt, archivedAt',
      subjects: '++id, classId, name, maxScore, order, archivedAt',
      students: '++id, classId, serialNo, fullName, sex, age, order, archivedAt',
      studentSemesters: '[studentId+semester], remark',
      scores: '[studentId+semester+subjectId], value',
      attendanceSessions: '++id, classId, date, period, subjectId',
      attendanceRecords: '[sessionId+studentId], status',
      settings: 'key, value'
    });

    // v3: spreadsheets. New tables only; v1 and v2 data is untouched.
    this.version(3).stores({
      sheets: '++id, classId, semester, name, order, template, createdAt, archivedAt',
      sheetData: 'sheetId, updatedAt'
    });

    // v2: link students to their row in the student list sheet. v1 is untouched;
    // existing rows simply have no sheetRowKey until the sheet sync fills it in.
    this.version(2).stores({
      students: '++id, classId, serialNo, fullName, sex, age, order, archivedAt, sheetRowKey'
    });
  }
}

export const db = new MarkBookDB();
