import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import HamburgerButton from '../components/HamburgerButton';
import { Button } from '../components/Button';
import { ExportIcon } from '../components/icons';
import type { ClassRow, Semester } from '../db/schema';
import { formatClassDisplayName, listClasses } from '../db/repositories/classes';
import { getSelectedClassId, getSelectedSemester, setSelectedClassId, setSelectedSemester } from '../state/selection';
import { usePreferences } from '../state/usePreferences';
import { loadAnalytics } from '../analytics/load';
import { calculateAnalytics, type AnalyticsSnapshot } from '../analytics/stats';

// Recharts is in this separate chunk, not the initial app shell.
const Charts = lazy(() => import('../analytics/Charts'));

export default function Analytics({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { tr, theme } = usePreferences();
  const a = tr.analytics;
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState<number | null>(null);
  const [semester, setSemester] = useState<Semester>(getSelectedSemester);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [data, setData] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => {
    const token = ++requestRef.current;
    void listClasses().then((rows) => {
      if (token !== requestRef.current) return;
      setClasses(rows);
      const selected = rows.find((c) => c.id === getSelectedClassId()) ?? rows[0] ?? null;
      setClassId(selected?.id ?? null);
      if (selected) setSelectedClassId(selected.id);
      else setLoading(false);
    }).catch(() => {
      if (token === requestRef.current) { setError(true); setLoading(false); }
    });
    return () => { requestRef.current += 1; };
  }, [retry]);

  useEffect(() => {
    if (classId === null) return;
    const token = ++requestRef.current;
    setLoading(true);
    setError(false);
    void loadAnalytics(classId, semester).then((snapshot) => {
      if (token !== requestRef.current) return;
      setData(snapshot);
      setLoading(false);
    }).catch(() => {
      if (token !== requestRef.current) return;
      setData(null);
      setError(true);
      setLoading(false);
    });
    return () => { requestRef.current += 1; };
  }, [classId, semester, retry]);

  const result = useMemo(() => data ? calculateAnalytics(data, semester, subjectId) : null, [data, semester, subjectId]);
  const chooseClass = (id: number) => {
    setClassId(id);
    setSelectedClassId(id);
    setSubjectId(null);
    setData(null);
  };
  const chooseSemester = (value: Semester) => {
    setSemester(value);
    setSelectedSemester(value);
    setSubjectId(null);
    setData(null);
  };
  const retryLoad = () => {
    if (classId === null) { setLoading(true); setError(false); setClasses([]); }
    setRetry((n) => n + 1);
  };
  const percent = (value: number | null | undefined) => value === null || value === undefined ? '–' : `${value}%`;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-6 pt-3" data-testid="analytics-page">
      <div className="flex items-center gap-3">
        <button type="button" aria-label={tr.menu.export} title={tr.attendance.exportLater} disabled className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-surface text-navy shadow-soft disabled:opacity-50">
          <ExportIcon width={22} height={22} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-navy">{a.title}</h1>
          <p className="mt-1 text-xs text-muted">{a.subtitle}</p>
        </div>
        <HamburgerButton onOpen={onOpenMenu} />
      </div>

      <section className="mt-5 rounded-card bg-surface p-4 shadow-soft" aria-label={a.filters}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="min-w-0 text-xs font-medium text-muted">
            {tr.home.selectClass}
            <select value={classId ?? ''} onChange={(e) => chooseClass(Number(e.target.value))} disabled={!classes.length} className="mt-1 block min-h-[44px] w-full rounded-btn border border-line bg-surface px-3 text-sm text-navy">
              {!classes.length && <option value="">{tr.spreadsheet.noClassTitle}</option>}
              {classes.map((row) => <option key={row.id} value={row.id}>{formatClassDisplayName(row)}</option>)}
            </select>
          </label>
          <label className="min-w-0 text-xs font-medium text-muted">
            {tr.attendance.subject}
            <select value={subjectId ?? ''} onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : null)} disabled={!data || loading} className="mt-1 block min-h-[44px] w-full rounded-btn border border-line bg-surface px-3 text-sm text-navy">
              <option value="">{a.allSubjects}</option>
              {data?.subjects.filter((s) => s.archivedAt === null).sort((x, y) => x.order - y.order).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs font-medium text-muted">{tr.home.semester}</span>
          <div className="flex flex-1 rounded-pill bg-header-bg p-1 sm:max-w-52" role="group" aria-label={tr.home.semester}>
            {([1, 2] as const).map((value) => <button key={value} type="button" aria-pressed={semester === value} onClick={() => chooseSemester(value)} className={`min-h-[44px] flex-1 rounded-pill text-sm font-semibold ${semester === value ? 'bg-accent text-surface' : 'text-navy'}`}>{value === 1 ? 'I' : 'II'}</button>)}
          </div>
        </div>
      </section>

      {loading ? <p role="status" className="mt-6 rounded-card bg-surface p-6 text-sm text-muted">{a.loading}</p> : error ? (
        <div className="mt-6 rounded-card bg-surface p-6 text-center" role="alert">
          <p className="text-sm text-danger">{a.loadFailed}</p>
          <Button className="mt-4" onClick={retryLoad}>{tr.attendance.retry}</Button>
        </div>
      ) : !classId ? (
        <section className="mt-6 rounded-card bg-surface p-8 text-center shadow-soft">
          <h2 className="text-base font-semibold text-navy">{a.noClass}</h2>
          <p className="mt-2 text-sm text-muted">{a.noClassBody}</p>
          <a href="#/home" className="mt-5 inline-flex min-h-[44px] items-center rounded-pill bg-accent px-5 text-sm font-semibold text-surface">{tr.home.newClass}</a>
        </section>
      ) : result && (
        <>
          <div className="my-4 grid grid-cols-3 gap-2 sm:gap-4">
            <Stat label={a.students} value={String(result.summaries.length)} />
            <Stat label={a.recordedMarks} value={String(result.recordedMarks)} />
            <Stat label={a.attendanceRate} value={percent(result.attendancePercent)} />
          </div>
          {!result.summaries.length && <div className="mb-4 rounded-card border border-line bg-surface p-4 text-center"><p className="text-sm text-navy">{tr.attendance.noStudentsTitle}</p><a href="#/add-record" className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-accent">{tr.attendance.goToAddRecord}</a></div>}
          <Suspense fallback={<div className="h-[400px] rounded-card bg-surface p-6 text-sm text-muted" role="status">{a.loadingCharts}</div>}>
            <Charts result={result} tr={tr} theme={theme} />
          </Suspense>
          <section className="mt-4 min-w-0 rounded-card bg-surface p-4 shadow-soft" aria-label={a.studentSummary}>
            <h2 className="text-sm font-semibold text-navy">{a.studentSummary}</h2>
            <p className="mt-1 text-xs text-muted">{a.summaryExplanation}</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm" data-testid="analytics-summary">
                <thead className="bg-header-bg text-xs text-muted"><tr>
                  <th className="px-2 py-3 text-left font-semibold">{tr.attendance.no}</th>
                  <th className="whitespace-nowrap px-2 py-3 text-left font-semibold">{tr.attendance.studentName}</th>
                  <th className="px-2 py-3 text-center font-semibold">{tr.attendance.sex}</th>
                  <th className="px-3 py-3 text-right font-semibold">{a.total}</th>
                  <th className="whitespace-nowrap px-2 py-3 text-right font-semibold">{a.attendanceRate}</th>
                </tr></thead>
                <tbody>{result.summaries.map((student) => <tr key={student.id} className="border-b border-line text-navy">
                  <td className="px-2 py-3 text-xs text-muted">{student.serialNo}</td>
                  <td className="min-w-32 px-2 py-3 font-medium">{student.fullName}</td>
                  <td className="px-2 py-3 text-center">{student.sex ?? '–'}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{student.total ?? '–'}</td>
                  <td className="px-2 py-3 text-right tabular-nums">{percent(student.attendancePercent)}</td>
                </tr>)}</tbody>
              </table>
              {!result.summaries.length && <p className="py-6 text-center text-sm text-muted">{a.noStudents}</p>}
            </div>
            <p className="mt-3 text-xs text-muted">{a.blankRule}</p>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-card bg-surface px-3 py-4 shadow-soft"><p className="text-xl font-semibold tabular-nums text-navy sm:text-2xl">{value}</p><p className="mt-1 text-xs text-muted">{label}</p></div>;
}
