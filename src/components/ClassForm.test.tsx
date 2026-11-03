// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ClassForm from './ClassForm';
import { createClass, formatClassDisplayName, generateClassName } from '../db/repositories/classes';
import { db } from '../db/schema';
import { getSelectedSemester, setSelectedSemester } from '../state/selection';

describe('ClassForm', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
    setSelectedSemester(1);
    vi.restoreAllMocks();
  });

  it('shows only the four required fields and keeps Save disabled until valid', () => {
    render(<ClassForm onCreated={() => {}} onCancel={() => {}} />);

    expect(screen.getByLabelText('Grade')).toBeTruthy();
    expect(screen.getByLabelText('Section')).toBeTruthy();
    expect(screen.getByLabelText('Academic year')).toBeTruthy();
    expect(screen.getByLabelText('Semester')).toBeTruthy();

    expect(screen.queryByLabelText('Class name')).toBeNull();
    expect(screen.queryByLabelText('School name')).toBeNull();
    expect(screen.queryByLabelText('Teacher name')).toBeNull();

    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Grade'), { target: { value: '11' } });
    fireEvent.change(screen.getByLabelText('Section'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Academic year'), { target: { value: '2018 EC' } });
    fireEvent.click(screen.getByRole('button', { name: 'II' }));

    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('generates the class name and preserves the chosen semester globally', async () => {
    const onCreated = vi.fn();
    render(<ClassForm onCreated={onCreated} onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText('Grade'), { target: { value: '11' } });
    fireEvent.change(screen.getByLabelText('Section'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Academic year'), { target: { value: '2018 EC' } });
    fireEvent.click(screen.getByRole('button', { name: 'II' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await Promise.resolve();

    expect(generateClassName('11', 'A')).toBe('11 A');
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(getSelectedSemester()).toBe(2);
  });

  it('rejects a duplicate grade, section and academic year', async () => {
    await createClass({
      name: '11 A',
      grade: '11',
      section: 'A',
      academicYear: '2018 EC',
      schoolName: '',
      teacherName: ''
    });

    render(<ClassForm onCreated={() => {}} onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText('Grade'), { target: { value: '11' } });
    fireEvent.change(screen.getByLabelText('Section'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Academic year'), { target: { value: '2018 EC' } });

    await waitFor(() => expect(screen.getByText(/already exists/i)).toBeTruthy());
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps legacy custom class names intact for display', () => {
    expect(formatClassDisplayName({ name: 'Custom class', grade: '11', section: 'A' })).toBe('Custom class');
    expect(formatClassDisplayName({ name: '11 A', grade: '11', section: 'A' })).toBe('Grade 11 A');
  });
});
