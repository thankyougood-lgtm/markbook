// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Analytics from './Analytics';
import { db } from '../db/schema';
import { createClass } from '../db/repositories/classes';
import { addStudent } from '../db/repositories/students';
import { addSubject } from '../db/repositories/subjects';
import { setScore } from '../db/repositories/scores';
import { getOrCreateSession, setRecord } from '../db/repositories/attendance';
import { setSelectedClassId, setSelectedSemester, getSelectedSemester } from '../state/selection';
import { setLang } from '../i18n';

vi.mock('../analytics/Charts', () => ({ default: () => <div data-testid="mock-charts" /> }));
let errors: unknown[][];
beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  localStorage.clear(); setSelectedClassId(null); setSelectedSemester(1); setLang('en');
  errors = [];
  vi.spyOn(console, 'error').mockImplementation((...args) => { errors.push(args); });
  vi.spyOn(console, 'warn').mockImplementation((...args) => { errors.push(args); });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); setLang('en'); });

describe('Analytics page', () => {
  it('has a useful no-class screen instead of a placeholder', async () => {
    render(<Analytics onOpenMenu={() => {}} />);
    await screen.findByText('No class to analyze yet');
    expect(screen.getByRole('link', { name: 'New class' }).getAttribute('href')).toBe('#/home');
    expect(screen.queryByText('This page is part of a later version.')).toBeNull();
    expect(errors).toEqual([]);
  });
  it('shows real saved marks and attendance and persists semester selection', async () => {
    const cls = await createClass({ name: '11A', academicYear: '2018', schoolName: '', teacherName: '' });
    setSelectedClassId(cls.id);
    const student = await addStudent(cls.id, { fullName: 'Abebe', sex: 'M', age: 16 });
    const subject = await addSubject(cls.id, 'Maths');
    await setScore(student, 1, subject, 80);
    const session = await getOrCreateSession(cls.id, '2026-11-07', 1, subject, 1);
    await setRecord(session, student, 'L');
    render(<Analytics onOpenMenu={() => {}} />);
    await waitFor(() => expect(within(screen.getByTestId('analytics-summary')).getByText('Abebe')).toBeTruthy());
    const row = within(screen.getByTestId('analytics-summary')).getByText('Abebe').closest('tr')!;
    expect(within(row).getByText('80')).toBeTruthy();
    expect(within(row).getByText('100%')).toBeTruthy();
    await screen.findByTestId('mock-charts');
    fireEvent.click(screen.getByRole('button', { name: 'II' }));
    await waitFor(() => expect(within(screen.getByTestId('analytics-summary')).queryByText('80')).toBeNull());
    expect(getSelectedSemester()).toBe(2);
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: String(subject) } });
    expect((screen.getByLabelText('Subject') as HTMLSelectElement).value).toBe(String(subject));
    expect(errors).toEqual([]);
  });
});
