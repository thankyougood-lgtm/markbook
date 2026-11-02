// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AddRecord from './AddRecord';
import { db } from '../db/schema';
import { createClass } from '../db/repositories/classes';
import { setSelectedClassId, setSelectedSemester } from '../state/selection';

// The grid library is lazily imported; the page must stay usable (and silent)
// whether or not it resolves inside jsdom.
vi.mock('../sheet/SpreadsheetGrid', () => ({
  default: () => <div data-testid="grid" />
}));

let consoleErrors: unknown[][] = [];

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
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

describe('AddRecord page', () => {
  it('renders the shell and the sheet tabs for an existing class', async () => {
    const cls = await createClass({
      name: '11A',
      academicYear: '2018 EC',
      schoolName: 'S',
      teacherName: 'T'
    });
    setSelectedClassId(cls.id);

    render(<AddRecord onOpenMenu={() => {}} />);

    expect(screen.getByLabelText('Export')).toBeTruthy();
    expect(screen.getByLabelText('Class and semester')).toBeTruthy();
    expect(screen.getByLabelText('Undo')).toBeTruthy();
    expect(screen.getByLabelText('Redo')).toBeTruthy();
    expect(screen.getByLabelText('Format')).toBeTruthy();
    expect(screen.getByLabelText('Search')).toBeTruthy();
    expect(screen.getAllByLabelText('More').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Add sheet')).toBeTruthy();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sheet1' })).toBeTruthy());
    expect(screen.getByTestId('grid')).toBeTruthy();
    expect(screen.getByLabelText('Cell content')).toBeTruthy();
    expect(screen.getByLabelText('Copy')).toBeTruthy();
    expect(screen.getByLabelText('Merge cells')).toBeTruthy();
    expect(screen.getByText('11A - I')).toBeTruthy();
    expect(consoleErrors).toEqual([]);
  });

  it('offers to create a class when none exists', async () => {
    render(<AddRecord onOpenMenu={() => {}} />);
    await waitFor(() => expect(screen.getByText('Create a class to start')).toBeTruthy());
    expect(consoleErrors).toEqual([]);
  });
});
