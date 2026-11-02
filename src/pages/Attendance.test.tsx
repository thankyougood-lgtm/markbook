// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Attendance from './Attendance';
import { db } from '../db/schema';
import { createClass } from '../db/repositories/classes';
import { addStudent } from '../db/repositories/students';
import { setSelectedClassId } from '../state/selection';

let consoleErrors: unknown[][] = [];

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
  consoleErrors = [];
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    consoleErrors.push(args);
  });
});

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  setSelectedClassId(null);
});

describe('Attendance page', () => {
  it('lists the active students without the teacher typing names', async () => {
    const cls = await createClass({ name: '11A', academicYear: '2018 EC', schoolName: 'S', teacherName: 'T' });
    setSelectedClassId(cls.id);
    await addStudent(cls.id, { fullName: 'Abebe', sex: 'M', age: 16 });
    await addStudent(cls.id, { fullName: 'Sara', sex: 'F', age: 15 });

    render(<Attendance onOpenMenu={() => {}} />);

    await waitFor(() => expect(screen.getByText('Abebe')).toBeTruthy());
    expect(screen.getByText('Sara')).toBeTruthy();
    expect(screen.getByText('Mark all present')).toBeTruthy();
    expect(consoleErrors).toEqual([]);
  });

  it('cycles a status cell and marks everyone present', async () => {
    const cls = await createClass({ name: '11A', academicYear: '2018 EC', schoolName: 'S', teacherName: 'T' });
    setSelectedClassId(cls.id);
    await addStudent(cls.id, { fullName: 'Abebe', sex: 'M', age: 16 });

    render(<Attendance onOpenMenu={() => {}} />);
    const cell = await screen.findByLabelText('Status Abebe');

    fireEvent.click(cell);
    await waitFor(() => expect(cell.textContent).toBe('P'));

    fireEvent.click(screen.getByText('Mark all present'));
    await waitFor(() => expect(cell.textContent).toBe('P'));
    expect(consoleErrors).toEqual([]);
  });

  it('shows the empty state when the class has no students', async () => {
    const cls = await createClass({ name: '11A', academicYear: '2018 EC', schoolName: 'S', teacherName: 'T' });
    setSelectedClassId(cls.id);

    render(<Attendance onOpenMenu={() => {}} />);
    await waitFor(() => expect(screen.getByText('Add students in Add Record first')).toBeTruthy());
    expect(screen.getByText('Go to Add Record')).toBeTruthy();
    expect(consoleErrors).toEqual([]);
  });
});
