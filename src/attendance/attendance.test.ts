import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/schema';
import { addStudent, archiveStudent, listStudents } from '../db/repositories/students';
import {
  clearRecord,
  findSession,
  getOrCreateSession,
  listRecords,
  listRecordsForClass,
  setRecord
} from '../db/repositories/attendance';
import { computePercent, nextStatus } from './stats';

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe('status cycling', () => {
  it('goes empty -> P -> A -> L -> E -> empty', () => {
    expect(nextStatus(undefined)).toBe('P');
    expect(nextStatus('P')).toBe('A');
    expect(nextStatus('A')).toBe('L');
    expect(nextStatus('L')).toBe('E');
    expect(nextStatus('E')).toBe('');
  });
});

describe('attendance percent', () => {
  it('counts late as present and drops excused from the total', () => {
    expect(computePercent(['P', 'P', 'A', 'L'])).toBe(75);
    expect(computePercent(['P', 'E'])).toBe(100);
    expect(computePercent(['A', 'E'])).toBe(0);
    expect(computePercent(['E', 'E'])).toBeNull();
    expect(computePercent([])).toBeNull();
  });
});

describe('sessions', () => {
  it('reuses one session per class, date, period and subject', async () => {
    const first = await getOrCreateSession(1, '2024-01-02', 3, 7);
    const second = await getOrCreateSession(1, '2024-01-02', 3, 7);
    expect(second).toBe(first);
    expect((await findSession(1, '2024-01-02', 3, 7))?.id).toBe(first);

    const otherPeriod = await getOrCreateSession(1, '2024-01-02', 4, 7);
    expect(otherPeriod).not.toBe(first);
    const otherSubject = await getOrCreateSession(1, '2024-01-02', 3, null);
    expect(otherSubject).not.toBe(first);
  });

  it('saves statuses and reloads them for the same session', async () => {
    const a = await addStudent(1, { fullName: 'Abebe', sex: 'M', age: 16 });
    const b = await addStudent(1, { fullName: 'Sara', sex: 'F', age: 15 });
    const sessionId = await getOrCreateSession(1, '2024-01-02', 1, 7);
    await setRecord(sessionId, a, 'P');
    await setRecord(sessionId, b, 'A');

    const reloaded = await listRecords(sessionId);
    const byStudent = new Map(reloaded.map((r) => [r.studentId, r.status] as const));
    expect(byStudent.get(a)).toBe('P');
    expect(byStudent.get(b)).toBe('A');

    await setRecord(sessionId, a, 'L');
    expect((await listRecords(sessionId)).find((r) => r.studentId === a)?.status).toBe('L');
  });

  it('clears a status without removing the session', async () => {
    const a = await addStudent(1, { fullName: 'Abebe', sex: 'M', age: 16 });
    const sessionId = await getOrCreateSession(1, '2024-01-02', 1, 7);
    await setRecord(sessionId, a, 'P');
    await clearRecord(sessionId, a);
    expect(await listRecords(sessionId)).toHaveLength(0);
    expect((await findSession(1, '2024-01-02', 1, 7))?.id).toBe(sessionId);
  });

  it('aggregates every record of the class for the percent column', async () => {
    const a = await addStudent(1, { fullName: 'Abebe', sex: 'M', age: 16 });
    const s1 = await getOrCreateSession(1, '2024-01-02', 1, 7);
    const s2 = await getOrCreateSession(1, '2024-01-03', 1, 7);
    const other = await getOrCreateSession(2, '2024-01-02', 1, 7);
    await setRecord(s1, a, 'P');
    await setRecord(s2, a, 'A');
    await setRecord(other, a, 'P');

    const records = await listRecordsForClass(1);
    expect(records).toHaveLength(2);
    expect(computePercent(records.map((r) => r.status))).toBe(50);
  });
});

describe('archived students', () => {
  it('hides an archived student but keeps their attendance records', async () => {
    const a = await addStudent(1, { fullName: 'Abebe', sex: 'M', age: 16 });
    const sessionId = await getOrCreateSession(1, '2024-01-02', 1, 7);
    await setRecord(sessionId, a, 'P');
    await archiveStudent(a);

    expect(await listStudents(1)).toHaveLength(0);
    const records = await listRecords(sessionId);
    expect(records).toHaveLength(1);
    expect(records[0]?.studentId).toBe(a);
    expect((await db.attendanceRecords.toArray())).toHaveLength(1);
  });
});
