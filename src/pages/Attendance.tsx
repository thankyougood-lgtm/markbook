import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HamburgerButton from '../components/HamburgerButton';
import Sheet from '../components/Sheet';
import ClassForm from '../components/ClassForm';
import { Button } from '../components/Button';
import { ChevronDownIcon, ExportIcon } from '../components/icons';
import { t } from '../i18n';
import type { AttendanceStatus, ClassRow, Semester, StudentRow } from '../db/schema';
import { formatClassDisplayName, getClass, listClasses } from '../db/repositories/classes';
import { listStudents } from '../db/repositories/students';
import { addSubject, listSubjects } from '../db/repositories/subjects';
import {
  findSession,
  getOrCreateSession,
  listRecords,
  listRecordsForClass,
  replaceSessionRecords
} from '../db/repositories/attendance';
import { getSelectedClassId, getSelectedSemester, setSelectedClassId, setSelectedSemester } from '../state/selection';
import { computePercent } from '../attendance/stats';
import { listAttendanceSubjects } from '../attendance/roster';

const SAVE_DELAY_MS = 300;
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const STATUSES: AttendanceStatus[] = ['P', 'A', 'L', 'E'];

interface AttendanceContext {
  classId: number;
  semester: Semester;
  date: string;
  period: number;
  subjectName: string;
}

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function sameContext(a: AttendanceContext, b: AttendanceContext): boolean {
  return (
    a.classId === b.classId &&
    a.semester === b.semester &&
    a.date === b.date &&
    a.period === b.period &&
    a.subjectName.trim() === b.subjectName.trim()
  );
}

export default function Attendance({ onOpenMenu }: { onOpenMenu: () => void }) {
  const tr = t().attendance;
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classRow, setClassRow] = useState<ClassRow | null>(null);
  const [semester, setSemester] = useState<Semester>(() => getSelectedSemester());
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [date, setDate] = useState(todayIso);
  const [period, setPeriod] = useState(1);
  const [subjectName, setSubjectName] = useState('');
  const [subjectDraft, setSubjectDraft] = useState('');
  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus>>({});
  const [percentages, setPercentages] = useState<Record<number, number | null>>({});
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [classSheetOpen, setClassSheetOpen] = useState(false);
  const [creatingClass, setCreatingClass] = useState(false);

  const timerRef = useRef<number | null>(null);
  const saveSeqRef = useRef(0);
  const loadSeqRef = useRef(0);
  const statusesRef = useRef<Record<number, AttendanceStatus>>({});
  const studentsRef = useRef<StudentRow[]>([]);
  studentsRef.current = students;
  const pendingRef = useRef<{
    context: AttendanceContext;
    statuses: Record<number, AttendanceStatus>;
    studentIds: number[];
  } | null>(null);
  const contextRef = useRef<AttendanceContext>({ classId: 0, semester, date, period, subjectName });
  contextRef.current = { classId: classRow?.id ?? 0, semester, date, period, subjectName };

  const refreshPercentages = useCallback(async (classId: number, sem: Semester) => {
    const records = await listRecordsForClass(classId, sem);
    const byStudent = new Map<number, AttendanceStatus[]>();
    for (const record of records) {
      const list = byStudent.get(record.studentId) ?? [];
      list.push(record.status);
      byStudent.set(record.studentId, list);
    }
    const next: Record<number, number | null> = {};
    for (const [studentId, list] of byStudent) next[studentId] = computePercent(list);
    setPercentages(next);
  }, []);

  const flush = useCallback(async (): Promise<boolean> => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    if (!pending || !pending.context.classId || !pending.context.date) return true;
    const token = saveSeqRef.current;
    setSaveState('saving');
    try {
      const { context, statuses: nextStatuses, studentIds } = pending;
      let subjectId: number | null = null;
      const name = context.subjectName.trim();
      if (name) {
        const existing = (await listSubjects(context.classId)).find(
          (subject) => subject.name.toLowerCase() === name.toLowerCase()
        );
        subjectId = existing ? existing.id : await addSubject(context.classId, name);
      }
      const sessionId = await getOrCreateSession(
        context.classId,
        context.date,
        context.period,
        subjectId,
        context.semester
      );
      await replaceSessionRecords(sessionId, nextStatuses, studentIds);
      await refreshPercentages(context.classId, context.semester);
      if (token === saveSeqRef.current) {
        pendingRef.current = null;
        setSaveState('saved');
        return true;
      }
      return false;
    } catch {
      if (token === saveSeqRef.current) setSaveState('error');
      return false;
    }
  }, [refreshPercentages]);

  const scheduleSave = useCallback((nextStatuses: Record<number, AttendanceStatus>) => {
    statusesRef.current = nextStatuses;
    setStatuses(nextStatuses);
    pendingRef.current = {
      context: { ...contextRef.current },
      statuses: { ...nextStatuses },
      studentIds: studentsRef.current.map((student) => student.id)
    };
    saveSeqRef.current += 1;
    setSaveState('saving');
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS);
  }, [flush]);

  const loadSession = useCallback(async (context: AttendanceContext) => {
    const token = ++loadSeqRef.current;
    setLoadError(false);
    try {
      let subjectId: number | null = null;
      const name = context.subjectName.trim();
      if (name) {
        const subject = (await listSubjects(context.classId)).find(
          (item) => item.name.toLowerCase() === name.toLowerCase()
        );
        // A typed-but-unsaved subject is a new session, not the no-subject session.
        if (!subject) {
          if (token !== loadSeqRef.current) return;
          statusesRef.current = {};
          setStatuses({});
          pendingRef.current = null;
          setSaveState('saved');
          return;
        }
        subjectId = subject.id;
      }
      const session = await findSession(context.classId, context.date, context.period, subjectId, context.semester);
      const records = session ? await listRecords(session.id) : [];
      if (token !== loadSeqRef.current) return;
      const next: Record<number, AttendanceStatus> = {};
      for (const record of records) next[record.studentId] = record.status;
      statusesRef.current = next;
      setStatuses(next);
      pendingRef.current = null;
      setSaveState('saved');
    } catch {
      if (token === loadSeqRef.current) setLoadError(true);
    }
  }, []);

  const loadClassData = useCallback(async (cls: ClassRow, sem: Semester, context: AttendanceContext) => {
    const [roster, subjectOptions] = await Promise.all([
      listStudents(cls.id),
      listAttendanceSubjects(cls.id, sem)
    ]);
    setStudents(roster);
    setSubjects(subjectOptions);
    await refreshPercentages(cls.id, sem);
    await loadSession(context);
  }, [loadSession, refreshPercentages]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const rows = await listClasses();
        if (!alive) return;
        setClasses(rows);
        const current = rows.find((row) => row.id === getSelectedClassId()) ?? rows[0] ?? null;
        setClassRow(current);
        if (!current) {
          setLoading(false);
          return;
        }
        setSelectedClassId(current.id);
        const context: AttendanceContext = {
          classId: current.id,
          semester,
          date,
          period,
          subjectName
        };
        contextRef.current = context;
        await loadClassData(current, semester, context);
        if (alive) setLoading(false);
      } catch {
        if (alive) {
          setLoadError(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
    // Initial load only; later changes go through changeContext/chooseClass/chooseSemester.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onHide = () => {
      if (pendingRef.current) void flush();
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (pendingRef.current) void flush();
    };
  }, [flush]);

  const changeContext = useCallback(async (patch: Partial<AttendanceContext>) => {
    const previous = contextRef.current;
    const next = { ...previous, ...patch };
    if (sameContext(previous, next)) return;
    if (!(await flush())) return;
    contextRef.current = next;
    if (patch.date !== undefined) setDate(patch.date);
    if (patch.period !== undefined) setPeriod(patch.period);
    if (patch.subjectName !== undefined) setSubjectName(patch.subjectName);
    statusesRef.current = {};
    setStatuses({});
    pendingRef.current = null;
    setSaveState('saved');
    setLoading(true);
    try {
      await loadSession(next);
    } finally {
      setLoading(false);
    }
  }, [flush, loadSession]);

  const chooseClass = useCallback(async (id: number, semesterOverride?: Semester) => {
    const nextClass = classes.find((row) => row.id === id) ?? (await getClass(id)) ?? null;
    if (!nextClass) return;
    if (!(await flush())) return;
    const nextSemester = semesterOverride ?? semester;
    setSelectedClassId(id);
    setSelectedSemester(nextSemester);
    setSemester(nextSemester);
    setClassSheetOpen(false);
    setCreatingClass(false);
    setClassRow(nextClass);
    setSubjectName('');
    setSubjectDraft('');
    const context: AttendanceContext = {
      classId: nextClass.id,
      semester: nextSemester,
      date,
      period,
      subjectName: ''
    };
    contextRef.current = context;
    setLoading(true);
    try {
      await loadClassData(nextClass, nextSemester, context);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [classes, date, flush, loadClassData, period, semester]);

  const chooseSemester = useCallback(async (nextSemester: Semester) => {
    if (!classRow) return;
    if (!(await flush())) return;
    setSelectedSemester(nextSemester);
    setSemester(nextSemester);
    setClassSheetOpen(false);
    const context: AttendanceContext = {
      classId: classRow.id,
      semester: nextSemester,
      date,
      period,
      subjectName
    };
    contextRef.current = context;
    setLoading(true);
    try {
      setSubjects(await listAttendanceSubjects(classRow.id, nextSemester));
      await refreshPercentages(classRow.id, nextSemester);
      await loadSession(context);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [classRow, date, flush, loadSession, period, refreshPercentages, subjectName]);

  const setStudentStatus = (studentId: number, target: AttendanceStatus) => {
    const next = { ...statusesRef.current };
    if (next[studentId] === target) delete next[studentId];
    else next[studentId] = target;
    scheduleSave(next);
  };

  const markAllPresent = () => {
    const next: Record<number, AttendanceStatus> = {};
    for (const student of students) next[student.id] = 'P';
    scheduleSave(next);
  };

  const retryLoad = async () => {
    if (!classRow) return;
    setLoading(true);
    try {
      await loadClassData(classRow, semester, contextRef.current);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const commitSubject = () => {
    const trimmed = subjectDraft.trim();
    setSubjectDraft(trimmed);
    if (trimmed === subjectName.trim()) return;
    void changeContext({ subjectName: trimmed });
  };

  const summary = useMemo(() => {
    const counts = { P: 0, A: 0, L: 0, E: 0 };
    for (const student of students) {
      const status = statuses[student.id];
      if (status) counts[status] += 1;
    }
    return { ...counts, unrecorded: students.length - counts.P - counts.A - counts.L - counts.E };
  }, [statuses, students]);

  const saveLabel = saveState === 'saving' ? tr.saving : saveState === 'error' ? tr.saveFailed : tr.saved;
  const statusLabel: Record<AttendanceStatus, string> = {
    P: tr.present,
    A: tr.absent,
    L: tr.late,
    E: tr.excused
  };

  return (
    <div
      className="flex flex-col"
      style={{ height: 'calc(100vh - var(--nav-height) - var(--nav-gap) * 2 - var(--safe-bottom))' }}
    >
      <div className="flex items-center gap-2 px-3 pt-3">
        <button
          type="button"
          aria-label={t().menu.export}
          title={tr.exportLater}
          disabled
          className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-surface text-navy shadow-soft disabled:opacity-50"
        >
          <ExportIcon width={22} height={22} />
        </button>
        <button
          type="button"
          onClick={() => setClassSheetOpen(true)}
          aria-label={t().spreadsheet.classSheetTitle}
          className="flex min-w-0 flex-1 flex-col items-center leading-tight"
        >
          <span className="flex max-w-full items-center gap-1 text-sm font-semibold text-navy">
            <span className="truncate">
              {classRow ? `${formatClassDisplayName(classRow)} - ${semester === 1 ? 'I' : 'II'}` : tr.title}
            </span>
            <ChevronDownIcon width={16} height={16} className="shrink-0" />
          </span>
          <span className="text-[11px] text-muted" role="status">
            {saveLabel}
          </span>
        </button>
        <HamburgerButton onOpen={onOpenMenu} />
      </div>

      <div className="mt-2 flex flex-wrap items-end gap-2 px-3">
        <label className="text-xs text-muted">
          {tr.date}
          <input
            type="date"
            value={date}
            onChange={(event) => void changeContext({ date: event.target.value })}
            className="mt-1 block min-h-[44px] rounded-btn border border-line bg-surface px-2 py-2 text-sm text-navy"
          />
        </label>
        <label className="text-xs text-muted">
          {tr.period}
          <select
            value={period}
            onChange={(event) => void changeContext({ period: Number(event.target.value) })}
            className="mt-1 block min-h-[44px] rounded-btn border border-line bg-surface px-2 py-2 text-sm text-navy"
          >
            {PERIODS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 flex-1 text-xs text-muted">
          {tr.subject}
          <input
            list="attendance-subjects"
            value={subjectDraft}
            onChange={(event) => setSubjectDraft(event.target.value)}
            onBlur={commitSubject}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitSubject();
              }
            }}
            placeholder={tr.subjectPlaceholder}
            className="mt-1 block min-h-[44px] w-full rounded-btn border border-line bg-surface px-2 py-2 text-sm text-navy"
          />
          <datalist id="attendance-subjects">
            {subjects.map((subject) => (
              <option key={subject} value={subject} />
            ))}
          </datalist>
        </label>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-3 text-xs text-navy">
        <span>
          {tr.summary}: {summary.P} {tr.present}, {summary.A} {tr.absent}, {summary.L} {tr.late},{' '}
          {summary.E} {tr.excused}, {summary.unrecorded} {tr.notRecorded}
        </span>
        <Button
          type="button"
          onClick={markAllPresent}
          disabled={students.length === 0 || loading || subjectDraft.trim() !== subjectName.trim()}
          className="h-9 min-h-[44px] px-3 text-xs"
        >
          {tr.markAllPresent}
        </Button>
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-auto border-t border-line bg-surface" data-testid="attendance-scroll">
        {loading ? (
          <p className="p-4 text-sm text-muted" role="status">{tr.loading}</p>
        ) : loadError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-danger">{tr.loadFailed}</p>
            <Button type="button" onClick={() => void retryLoad()}>
              {tr.retry}
            </Button>
          </div>
        ) : !classRow ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-muted">{t().spreadsheet.createClassToStart}</p>
            <Button type="button" onClick={() => setClassSheetOpen(true)}>
              {t().home.newClass}
            </Button>
          </div>
        ) : (
          <>
            {students.length === 0 && (
              <div className="flex flex-col items-center gap-2 border-b border-line bg-header-bg p-3 text-center">
                <p className="text-sm font-semibold text-navy">{tr.noStudentsTitle}</p>
                <p className="text-xs text-muted">{tr.noStudentsBody}</p>
                <a
                  href="#/add-record"
                  className="rounded-btn bg-accent px-4 py-2 text-sm font-semibold text-surface"
                >
                  {tr.goToAddRecord}
                </a>
              </div>
            )}
            <table className="w-full border-collapse text-sm text-navy" data-testid="attendance-table">
              <thead className="sticky top-0 z-20 bg-header-bg text-xs">
                <tr>
                  <th className="att-no border-b border-line px-2 py-2 text-center font-semibold">{tr.no}</th>
                  <th className="att-name border-b border-line px-2 py-2 text-left font-semibold">{tr.studentName}</th>
                  <th className="border-b border-line px-2 py-2 text-center font-semibold">{tr.sex}</th>
                  <th className="border-b border-line px-2 py-2 text-center font-semibold">{t().sheet.age}</th>
                  <th className="border-b border-line px-2 py-2 text-center font-semibold">{tr.semester}</th>
                  {STATUSES.map((status) => (
                    <th key={status} className="border-b border-line px-1 py-2 text-center font-semibold">
                      {t().attendance[`status${status}` as 'statusP' | 'statusA' | 'statusL' | 'statusE']}
                    </th>
                  ))}
                  <th className="border-b border-line px-2 py-2 text-center font-semibold">{tr.percent}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const status = statuses[student.id];
                  const pct = percentages[student.id];
                  return (
                    <tr key={student.id} className="border-b border-line">
                      <td className="att-no px-2 py-1 text-center text-xs text-muted">{student.serialNo}</td>
                      <td className="att-name max-w-[180px] truncate px-2 py-1 font-medium">{student.fullName}</td>
                      <td className="px-2 py-1 text-center text-xs">{student.sex ?? ''}</td>
                      <td className="px-2 py-1 text-center text-xs">{student.age ?? ''}</td>
                      <td className="px-2 py-1 text-center text-xs">{semester === 1 ? 'I' : 'II'}</td>
                      {STATUSES.map((item) => (
                        <td key={item} className="px-0.5 py-0.5 text-center">
                          <button
                            type="button"
                            aria-label={`${student.fullName} - ${statusLabel[item]}`}
                            aria-pressed={status === item}
                            disabled={loading || subjectDraft.trim() !== subjectName.trim()}
                            onClick={() => setStudentStatus(student.id, item)}
                            className={`h-11 w-11 rounded-btn text-sm font-semibold ${
                              status === item ? 'bg-accent text-surface shadow-soft' : 'text-muted hover:bg-header-bg'
                            }`}
                          >
                            {status === item ? '\u2713' : ''}
                          </button>
                        </td>
                      ))}
                      <td className="px-2 py-1 text-center text-xs text-muted">
                        {pct === null || pct === undefined ? '-' : `${pct}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

      {classSheetOpen && (
        <Sheet title={t().spreadsheet.classSheetTitle} onClose={() => setClassSheetOpen(false)}>
          {creatingClass ? (
            <ClassForm
              onCancel={() => setCreatingClass(false)}
              onCreated={(created) => {
                setClasses((rows) => [...rows, created]);
                const createdSemester = getSelectedSemester();
                void chooseClass(created.id, createdSemester);
              }}
            />
          ) : (
            <div className="space-y-3">
              <label className="block text-sm text-navy" htmlFor="attendance-class">
                {t().home.selectClass}
                <select
                  id="attendance-class"
                  value={classRow?.id ?? ''}
                  onChange={(event) => void chooseClass(Number(event.target.value))}
                  className="mt-1 w-full rounded-btn border border-line bg-surface px-3 py-3 text-sm font-medium text-navy"
                >
                  {classes.map((row) => (
                    <option key={row.id} value={row.id}>
                      {formatClassDisplayName(row)}
                    </option>
                  ))}
                </select>
              </label>

              <span className="block text-xs font-medium text-muted">{t().home.semester}</span>
              <div className="flex rounded-pill bg-header-bg p-1" role="group" aria-label={t().home.semester}>
                {([1, 2] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={semester === item}
                    onClick={() => void chooseSemester(item)}
                    className={`min-h-[44px] flex-1 rounded-pill py-2 text-sm font-semibold ${
                      semester === item ? 'bg-accent text-surface' : 'text-navy'
                    }`}
                  >
                    {item === 1 ? 'I' : 'II'}
                  </button>
                ))}
              </div>

              <Button type="button" variant="secondary" onClick={() => setCreatingClass(true)}>
                {t().home.newClass}
              </Button>
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}
