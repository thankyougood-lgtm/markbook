import type { Semester } from '../db/schema';

const CLASS_KEY = 'markbook.classId';
const SEM_KEY = 'markbook.semester';

export function getSelectedClassId(): number | null {
  try {
    const raw = localStorage.getItem(CLASS_KEY);
    const n = raw === null ? NaN : Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function setSelectedClassId(id: number | null): void {
  try {
    if (id === null) localStorage.removeItem(CLASS_KEY);
    else localStorage.setItem(CLASS_KEY, String(id));
  } catch {
    // unavailable
  }
}

export function getSelectedSemester(): Semester {
  try {
    return localStorage.getItem(SEM_KEY) === '2' ? 2 : 1;
  } catch {
    return 1;
  }
}

export function setSelectedSemester(s: Semester): void {
  try {
    localStorage.setItem(SEM_KEY, String(s));
  } catch {
    // unavailable
  }
}
