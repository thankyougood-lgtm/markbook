// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AddRecordPage from './AddRecordPage';
import App from '../../App';
import { db } from '../../db/schema';
import { createClass } from '../../db/repositories/classes';
import { addSubject } from '../../db/repositories/subjects';
import { addStudent } from '../../db/repositories/students';
import { setSelectedClassId, setSelectedSemester } from '../../state/selection';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let errors: unknown[];
let consoleErrors: unknown[][];

beforeEach(async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  errors = [];
  consoleErrors = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    consoleErrors.push(args);
  });
  await Promise.all(db.tables.map((t) => t.clear()));
  localStorage.clear();
  window.location.hash = '/';
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

async function render(node: React.ReactNode) {
  try {
    await act(async () => {
      root.render(node);
    });
    await act(async () => {
      await Promise.resolve();
    });
  } catch (e) {
    errors.push(e);
  }
}

describe('AddRecordPage', () => {
  it('renders with no selected class and offers the class card', async () => {
    await render(<AddRecordPage />);
    expect(errors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(container.textContent).toContain('Select or create a class');
  });

  it('renders the grid for a selected class', async () => {
    const cls = await createClass({ name: '11A', academicYear: '2018 EC', schoolName: 'S', teacherName: 'T' });
    const subjectId = await addSubject(cls.id, 'Maths');
    await addStudent(cls.id, { fullName: 'Abebe', sex: 'M', age: 16 });
    await db.scores.put({ studentId: 1, semester: 1, subjectId, value: 47 });
    setSelectedClassId(cls.id);
    setSelectedSemester(1);

    await render(<AddRecordPage />);

    expect(errors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(container.textContent).toContain('Abebe');
    expect(container.textContent).toContain('11A');
    const cells = container.querySelectorAll('tbody td');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('renders through the App route without a blank page', async () => {
    const cls = await createClass({ name: '11B', academicYear: '2018 EC', schoolName: 'S', teacherName: 'T' });
    setSelectedClassId(cls.id);
    window.location.hash = '/add-record';

    await render(<App />);

    expect(errors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(container.textContent).toContain('11B');
  });
});
