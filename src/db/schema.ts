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

export class MarkBookDB extends Dexie {
  classes!: EntityTable<ClassRow, 'id'>;
  subjects!: EntityTable<SubjectRow, 'id'>;
  students!: EntityTable<StudentRow, 'id'>;
  studentSemesters!: EntityTable<StudentSemesterRow, 'studentId'>;
  scores!: EntityTable<ScoreRow, 'studentId'>;
  attendanceSessions!: EntityTable<AttendanceSessionRow, 'id'>;
  attendanceRecords!: EntityTable<AttendanceRecordRow, 'sessionId'>;
  settings!: EntityTable<SettingRow, 'key'>;

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

    // v2: link students to their row in the student list sheet. v1 is untouched;
    // existing rows simply have no sheetRowKey until the sheet sync fills it in.
    this.version(2).stores({
      students: '++id, classId, serialNo, fullName, sex, age, order, archivedAt, sheetRowKey'
    });
  }
}

export const db = new MarkBookDB();
