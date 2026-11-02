import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HamburgerButton from '../components/HamburgerButton';
import { ExportIcon } from '../components/icons';
import { t } from '../i18n';
import type { AttendanceStatus, ClassRow, Semester, StudentRow } from '../db/schema';
import { listClasses } from '../db/repositories/classes';
import { listStudents } from '../db/repositories/students';
import { addSubject, listSubjects } from '../db/repositories/subjects';
import {
  clearRecord,
  findSession,
  getOrCreateSession,
  listRecords,
  listRecordsForClass,
  setRecord
} from '../db/repositories/attendance';
import { getSelectedClassId, getSelectedSemester } from '../state/selection';
import { computePercent, nextStatus } from '../attendance/stats';

const SAVE_DELAY_MS = 300;
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const statusClass: Record<AttendanceStatus | '', string> = {
  P: 'bg-accent text-surface',
  A: 'bg-danger text-surface',
  L: 'bg-warning text-surface',
  E: 'bg-header-bg text-muted',
  '': 'bg-surface text-navy'
};

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function Attendance({ onOpenMenu }: { onOpenMenu: () => void }) {
  const tr = t().attendance;
  const [classRow, setClassRow] = useState<ClassRow | null>(null);
  const [semester] = useState<Semester>(() => getSelectedSemester());
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [date, setDate] = useState(todayIso);
  const [period, setPeriod] = useState(1);
  const [subjectName, setSubjectName] = useState('');
  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus>>({});
  const [percentages, setPercentages] = useState<Record<number, number | null>>({});
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [loading, setLoading] = useState(true);

  const sessionIdRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const statusesRef = useRef<Record<number, AttendanceStatus>>({});
  statusesRef.current = statuses;
  const contextRef = useRef({ classId: 0, date: '', period: 1, subjectName: '' });
  contextRef.current = { classId: classRow?.id ?? 0, date, period, subjectName };

  const subjectIdRef = useRef<number | null>(null);

  const refreshPercentages = useCallback(async (classId: number) => {
    const records = await listRecordsForClass(classId);
    const byStudent = new Map<number, AttendanceStatus[]>();
    for (const r of records) {
      const list = byStudent.get(r.studentId) ?? [];
      list.push(r.status);
      byStudent.set(r.studentId, list);
    }
    const next: Record<number, number | null> = {};
    for (const [studentId, list] of byStudent) next[studentId] = computePercent(list);
    setPercentages(next);
  }, []);

  // Load the class, its active students and the subject names.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const rows = await listClasses();
      if (!alive) return;
      const current = rows.find((c) => c.id === getSelectedClassId()) ?? rows[0] ?? null;
      setClassRow(current);
      if (!current) {
        setLoading(false);
        return;
      }
      setStudents(await listStudents(current.id));
      setSubjects((await listSubjects(current.id)).map((s) => s.name));
      await refreshPercentages(current.id);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [refreshPercentages]);

  // Load the saved statuses whenever the session key changes.
  useEffect(() => {
    if (!classRow) return;
    let alive = true;
    void (async () => {
      const subjectsForClass = await listSubjects(classRow.id);
      const subject = subjectsForClass.find((s) => s.name === subjectName.trim());
      subjectIdRef.current = subject ? subject.id : null;
      const session = await findSession(classRow.id, date, period, subjectIdRef.current);
      if (!alive) return;
      if (!session) {
        sessionIdRef.current = null;
        setStatuses({});
        return;
      }
      sessionIdRef.current = session.id;
      const records = await listRecords(session.id);
      if (!alive) return;
      const next: Record<number, AttendanceStatus> = {};
      for (const r of records) next[r.studentId] = r.status;
      setStatuses(next);
    })();
    return () => {
      alive = false;
    };
  }, [classRow, date, period, subjectName]);

  const flush = useCallback(async () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const { classId, date: d, period: p, subjectName: name } = contextRef.current;
    if (!classId || !d) return;
    setSaveState('saving');
    try {
      let subjectId = subjectIdRef.current;
      if (name.trim() && subjectId === null) {
        const existing = (await listSubjects(classId)).find((s) => s.name === name.trim());
        subjectId = existing ? existing.id : await addSubject(classId, name.trim());
        subjectIdRef.current = subjectId;
      }
      const sessionId =
        sessionIdRef.current ?? (await getOrCreateSession(classId, d, p, subjectId));
      sessionIdRef.current = sessionId;
      const current = statusesRef.current;
      for (const student of students) {
        const status = current[student.id];
        if (status) await setRecord(sessionId, student.id, status);
        else await clearRecord(sessionId, student.id);
      }
      await refreshPercentages(classId);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [students, refreshPercentages]);

  const markDirty = () => {
    setSaveState('saving');
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS);
  };

  useEffect(() => {
    const onHide = () => {
      if (timerRef.current !== null) void flush();
    };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [flush]);

  const cycle = (studentId: number) => {
    setStatuses((prev) => {
      const next = nextStatus(prev[studentId]);
      const copy = { ...prev };
      if (next) copy[studentId] = next;
      else delete copy[studentId];
      return copy;
    });
    markDirty();
  };

  const markAllPresent = () => {
    const next: Record<number, AttendanceStatus> = {};
    for (const s of students) next[s.id] = 'P';
    setStatuses(next);
    markDirty();
  };

  const summary = useMemo(() => {
    const counts = { P: 0, A: 0, L: 0, E: 0 };
    for (const student of students) {
      const status = statuses[student.id];
      if (status) counts[status] += 1;
    }
    return counts;
  }, [statuses, students]);

  const saveLabel =
    saveState === 'saving' ? tr.saving : saveState === 'error' ? tr.saveFailed : tr.saved;

  return (
    <div
      className="flex flex-col"
      style={{ height: 'calc(100vh - var(--nav-height) - var(--nav-gap) * 2 - var(--safe-bottom))' }}
    >
      <div className="flex items-center gap-2 px-3 pt-3">
        <button
          type="button"
          aria-label={t().menu.export}
          className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-surface text-navy shadow-soft"
        >
          <ExportIcon width={22} height={22} />
        </button>
        <div className="min-w-0 flex-1 text-center leading-tight">
          <p className="truncate text-sm font-semibold text-navy">
            {classRow ? `${classRow.name} - ${semester === 1 ? 'I' : 'II'}` : tr.title}
          </p>
          <p className="text-[11px] text-muted" role="status">
            {saveLabel}
          </p>
        </div>
        <HamburgerButton onOpen={onOpenMenu} />
      </div>

      <div className="mt-2 flex flex-wrap items-end gap-2 px-3">
        <label className="text-xs text-muted">
          {tr.date}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block rounded-btn border border-line bg-surface px-2 py-2 text-sm text-navy"
          />
        </label>
        <label className="text-xs text-muted">
          {tr.period}
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="mt-1 block rounded-btn border border-line bg-surface px-2 py-2 text-sm text-navy"
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 flex-1 text-xs text-muted">
          {tr.subject}
          <input
            list="attendance-subjects"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder={tr.subjectPlaceholder}
            className="mt-1 block w-full rounded-btn border border-line bg-surface px-2 py-2 text-sm text-navy"
          />
          <datalist id="attendance-subjects">
            {subjects.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-3 text-xs text-navy">
        <span>
          {tr.summary}: {summary.P} {tr.present}, {summary.A} {tr.absent}, {summary.L} {tr.late},{' '}
          {summary.E} {tr.excused}
        </span>
        <button
          type="button"
          onClick={markAllPresent}
          className="rounded-btn bg-accent px-3 py-2 text-xs font-semibold text-surface"
        >
          {tr.markAllPresent}
        </button>
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-auto border-t border-line bg-surface">
        {loading ? null : !classRow || students.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm font-semibold text-navy">{tr.noStudentsTitle}</p>
            <p className="text-sm text-muted">{tr.noStudentsBody}</p>
            <a
              href="#/add-record"
              className="rounded-btn bg-accent px-5 py-3 text-sm font-semibold text-surface"
            >
              {tr.goToAddRecord}
            </a>
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-header-bg text-xs text-muted">
              <tr>
                <th className="att-no px-2 py-2 text-left font-semibold">{tr.no}</th>
                <th className="att-name px-2 py-2 text-left font-semibold">{tr.studentName}</th>
                <th className="px-2 py-2 text-left font-semibold">{tr.sex}</th>
                <th className="px-2 py-2 text-left font-semibold">{tr.status}</th>
                <th className="px-2 py-2 text-right font-semibold">{tr.percent}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const status = statuses[student.id] ?? '';
                const pct = percentages[student.id];
                return (
                  <tr key={student.id} className="border-t border-line">
                    <td className="att-no px-2 py-2 text-muted">{student.serialNo}</td>
                    <td className="att-name px-2 py-2 font-medium text-navy">{student.fullName}</td>
                    <td className="px-2 py-2 text-muted">{student.sex ?? ''}</td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => cycle(student.id)}
                        aria-label={`${tr.status} ${student.fullName}`}
                        className={`flex h-9 w-12 items-center justify-center rounded-btn border border-line font-semibold ${statusClass[status]}`}
                      >
                        {status}
                      </button>
                    </td>
                    <td className="px-2 py-2 text-right text-muted">
                      {pct === null || pct === undefined ? '-' : `${pct}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
