import type { AttendanceStatus } from '../db/schema';

const CYCLE: (AttendanceStatus | '')[] = ['', 'P', 'A', 'L', 'E'];

/** Tap order for a status cell: empty -> P -> A -> L -> E -> empty. */
export function nextStatus(current: AttendanceStatus | '' | undefined): AttendanceStatus | '' {
  const index = CYCLE.indexOf(current ?? '');
  return CYCLE[(index + 1) % CYCLE.length] ?? '';
}

/**
 * Present / recorded, as a percentage with one decimal.
 * Late counts as present, excused is removed from the total, and a student with
 * no recorded status returns null (shown as a dash).
 */
export function computePercent(statuses: AttendanceStatus[]): number | null {
  const present = statuses.filter((s) => s === 'P').length;
  const late = statuses.filter((s) => s === 'L').length;
  const absent = statuses.filter((s) => s === 'A').length;
  const recorded = present + late + absent;
  if (recorded === 0) return null;
  return Math.round(((present + late) / recorded) * 1000) / 10;
}
