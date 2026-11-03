// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Attendance from './Attendance';
import { db } from '../db/schema';
import { createClass } from '../db/repositories/classes';
import { addStudent } from '../db/repositories/students';
import { setSelectedClassId } from '../state/selection';

// The grid is lazily loaded, so it is replaced with a probe that records the
// rows handed to it and lets the test simulate taps.
const grids: { data: unknown[][]; onCellTap?: (x: number, y: number) => void }[] = [];
vi.mock('../sheet/SpreadsheetGrid', () => ({
  default: (props: { data: unknown[][]; onCellTap?: (x: number, y: number) => void }) => {
    grids.push(props);
    return <div data-testid="grid" />;
  }
}));

let consoleErrors: unknown[][] = [];

beforeEach(async () => {
  grids.length = 0;
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

    await waitFor(() => expect(grids.length).toBeGreaterThan(0));
    const data = grids[grids.length - 1]!.data;
    expect(data[0]?.slice(0, 5)).toEqual(['NO', 'Students name', 'Sex', 'Age', 'Semester']);
    expect(data[1]?.slice(0, 5)).toEqual(['1', 'Abebe', 'M', '16', 'I']);
    expect(data[2]?.slice(0, 5)).toEqual(['2', 'Sara', 'F', '15', 'I']);
    expect(data[1]?.[9]).toBe('-');
    expect(screen.getByText('Mark all present')).toBeTruthy();
    expect(consoleErrors).toEqual([]);
  });

  it('cycles a status cell and marks everyone present', async () => {
    const cls = await createClass({ name: '11A', academicYear: '2018 EC', schoolName: 'S', teacherName: 'T' });
    setSelectedClassId(cls.id);
    await addStudent(cls.id, { fullName: 'Abebe', sex: 'M', age: 16 });

    render(<Attendance onOpenMenu={() => {}} />);
    await waitFor(() => expect(grids.length).toBeGreaterThan(0));

    // Present is column 5, absent column 6; the first student is sheet row 1.
    grids[grids.length - 1]!.onCellTap?.(5, 1);
    await waitFor(() => expect(grids[grids.length - 1]!.data[1]?.[5]).toBe('\u2713'));

    grids[grids.length - 1]!.onCellTap?.(6, 1);
    await waitFor(() => {
      const row = grids[grids.length - 1]!.data[1] as string[];
      expect(row[5]).toBe('');
      expect(row[6]).toBe('\u2713');
    });

    grids[grids.length - 1]!.onCellTap?.(6, 1);
    await waitFor(() => expect(grids[grids.length - 1]!.data[1]?.[6]).toBe(''));

    fireEvent.click(screen.getByText('Mark all present'));
    await waitFor(() => expect(grids[grids.length - 1]!.data[1]?.[5]).toBe('\u2713'));
    expect(consoleErrors).toEqual([]);
  });

  it('shows the empty roster grid with a banner when the class has no students', async () => {
    const cls = await createClass({ name: '11A', academicYear: '2018 EC', schoolName: 'S', teacherName: 'T' });
    setSelectedClassId(cls.id);

    render(<Attendance onOpenMenu={() => {}} />);
    await waitFor(() => expect(grids.length).toBeGreaterThan(0));
    expect(screen.getByText('Add students in Add Record first')).toBeTruthy();
    expect(screen.getByText('Go to Add Record')).toBeTruthy();
    const data = grids[grids.length - 1]!.data;
    expect(data[0]?.slice(0, 5)).toEqual(['NO', 'Students name', 'Sex', 'Age', 'Semester']);
    expect(consoleErrors).toEqual([]);
  });
});
