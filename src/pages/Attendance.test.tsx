// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Attendance from './Attendance';
import { db } from '../db/schema';
import { createClass } from '../db/repositories/classes';
import { addStudent, archiveStudent } from '../db/repositories/students';
import { getOrCreateSession, setRecord } from '../db/repositories/attendance';
import { setSelectedClassId, setSelectedSemester } from '../state/selection';

let consoleErrors: unknown[][] = [];

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
  setSelectedClassId(null);
  setSelectedSemester(1);
  consoleErrors = [];
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    consoleErrors.push(args);
  });
  vi.spyOn(console, 'warn').mockImplementation((...args) => {
    consoleErrors.push(args);
  });
});

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  setSelectedClassId(null);
});

async function seedClass() {
  const cls = await createClass({ name: '11A', academicYear: '2018 EC', schoolName: 'S', teacherName: 'T' });
  setSelectedClassId(cls.id);
  const abebe = await addStudent(cls.id, { fullName: 'Abebe', sex: 'M', age: 16 });
  const sara = await addStudent(cls.id, { fullName: 'Sara', sex: 'F', age: 15 });
  const archived = await addStudent(cls.id, { fullName: 'Hidden', sex: 'M', age: 17 });
  await archiveStudent(archived);
  return { cls, abebe, sara };
}

async function renderAttendance() {
  render(<Attendance onOpenMenu={() => {}} />);
  await waitFor(() => expect(screen.getByTestId('attendance-table')).toBeTruthy());
}

describe('Attendance page', () => {
  it('lists the active roster in order without the teacher typing names', async () => {
    await seedClass();
    await renderAttendance();

    const table = screen.getByTestId('attendance-table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[1]!).getByText('Abebe')).toBeTruthy();
    expect(within(rows[2]!).getByText('Sara')).toBeTruthy();
    expect(screen.queryByText('Hidden')).toBeNull();
    expect(screen.getByRole('button', { name: 'Abebe - present' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Mark all present')).toBeTruthy();
    expect(consoleErrors).toEqual([]);
  });

  it('toggles one status per student and can mark everyone present', async () => {
    await seedClass();
    await renderAttendance();

    const present = screen.getByRole('button', { name: 'Abebe - present' });
    const absent = screen.getByRole('button', { name: 'Abebe - absent' });
    fireEvent.click(present);
    await waitFor(() => expect(present.getAttribute('aria-pressed')).toBe('true'));

    fireEvent.click(absent);
    await waitFor(() => {
      expect(present.getAttribute('aria-pressed')).toBe('false');
      expect(absent.getAttribute('aria-pressed')).toBe('true');
    });

    fireEvent.click(absent);
    await waitFor(() => expect(absent.getAttribute('aria-pressed')).toBe('false'));

    fireEvent.click(screen.getByText('Mark all present'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Abebe - present' }).getAttribute('aria-pressed')).toBe('true');
      expect(screen.getByRole('button', { name: 'Sara - present' }).getAttribute('aria-pressed')).toBe('true');
    });
    expect(consoleErrors).toEqual([]);
  });

  it('auto-saves statuses and reloads them for the same session', async () => {
    const { cls, abebe } = await seedClass();
    await renderAttendance();

    fireEvent.click(screen.getByRole('button', { name: 'Abebe - late' }));
    await waitFor(async () => {
      const sessions = await db.attendanceSessions.where('classId').equals(cls.id).toArray();
      expect(sessions).toHaveLength(1);
      const records = await db.attendanceRecords.where('sessionId').equals(sessions[0]!.id).toArray();
      expect(records).toEqual([{ sessionId: sessions[0]!.id, studentId: abebe, status: 'L' }]);
    });

    cleanup();
    await renderAttendance();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Abebe - late' }).getAttribute('aria-pressed')).toBe('true')
    );
    expect(consoleErrors).toEqual([]);
  });

  it('keeps Semester I and Semester II attendance separate', async () => {
    const { cls, abebe } = await seedClass();
    const sessionOne = await getOrCreateSession(cls.id, '2026-11-07', 1, null, 1);
    await setRecord(sessionOne, abebe, 'P');

    await renderAttendance();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Abebe - present' }).getAttribute('aria-pressed')).toBe('true')
    );

    fireEvent.click(screen.getByLabelText('Class and semester'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'II' }));

    await waitFor(() => expect(screen.getByText('11A - II')).toBeTruthy());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Abebe - present' }).getAttribute('aria-pressed')).toBe('false')
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abebe - absent' }));
    await waitFor(async () => {
      const sessions = await db.attendanceSessions.where('classId').equals(cls.id).toArray();
      expect(sessions).toHaveLength(2);
      expect(sessions.some((session) => session.semester === 2)).toBe(true);
    });
    expect(consoleErrors).toEqual([]);
  });

  it('shows the empty roster banner when the class has no students', async () => {
    const cls = await createClass({ name: '11A', academicYear: '2018 EC', schoolName: 'S', teacherName: 'T' });
    setSelectedClassId(cls.id);
    await renderAttendance();

    expect(screen.getByText('Add students in Add Record first')).toBeTruthy();
    expect(screen.getByText('Go to Add Record')).toBeTruthy();
    const table = screen.getByTestId('attendance-table');
    expect(within(table).getAllByRole('row')).toHaveLength(1);
    expect(screen.getByText('Mark all present').closest('button')?.disabled).toBe(true);
    expect(consoleErrors).toEqual([]);
  });
});
