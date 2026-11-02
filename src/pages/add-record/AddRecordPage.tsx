import { useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n';
import { listClasses } from '../../db/repositories/classes';
import type { ClassRow, Semester } from '../../db/schema';
import {
  getSelectedClassId,
  getSelectedSemester,
  setSelectedClassId,
  setSelectedSemester
} from '../../state/selection';
import { useSheet } from './useSheet';
import { INITIAL_BLANK_ROWS, buildColumns, buildRows, type ColKind } from './model';
import { ExportIcon } from '../../components/icons';

type Tr = ReturnType<typeof t>;

const selectClass =
  'shrink-0 rounded-btn border border-line bg-surface px-2 py-1.5 text-xs font-medium text-navy outline-none focus:border-accent';

function headerLabel(kind: ColKind, tr: Tr): string {
  switch (kind) {
    case 'no':
      return tr.record.no;
    case 'name':
      return tr.record.name;
    case 'sex':
      return tr.record.sex;
    case 'age':
      return tr.record.age;
    case 'total':
      return tr.record.total;
    case 'remark':
      return tr.record.remark;
    default:
      return '';
  }
}

export default function AddRecordPage() {
  const tr = t();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState<number | null>(() => getSelectedClassId());
  const [semester, setSemester] = useState<Semester>(() => getSelectedSemester());
  const [blankRows] = useState(INITIAL_BLANK_ROWS);

  useEffect(() => {
    void listClasses().then(setClasses);
  }, []);

  const { subjects, students } = useSheet(classId, semester);
  const columns = useMemo(() => buildColumns(subjects), [subjects]);
  const rows = useMemo(() => buildRows(students, blankRows), [students, blankRows]);

  const chooseClass = (id: number | null) => {
    setClassId(id);
    setSelectedClassId(id);
  };

  const chooseSemester = (s: Semester) => {
    setSemester(s);
    setSelectedSemester(s);
  };

  if (classId === null) {
    return (
      <div className='px-4 pt-6'>
        <section className='rounded-card bg-surface p-6 text-center shadow-soft'>
          <p className='text-sm text-navy'>{tr.record.emptyNoClass}</p>
          <button
            type='button'
            onClick={() => {
              window.location.hash = '/';
            }}
            className='mt-4 rounded-btn bg-accent px-5 py-2.5 text-sm font-semibold text-surface'
          >
            {tr.record.goHome}
          </button>
        </section>
      </div>
    );
  }

  const currentClass = classes.find((c) => c.id === classId);
  const title = `${currentClass?.name ?? ''} - ${tr.record.semesterLabel} ${semester === 1 ? 'I' : 'II'}`;

  return (
    <div className='flex flex-col' style={{ height: 'calc(100dvh - 84px)' }}>
      <div className='flex items-center gap-2 px-3 pt-1'>
        <button
          type='button'
          aria-label={tr.menu.export}
          className='flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-surface text-navy shadow-soft'
        >
          <ExportIcon width={20} height={20} />
        </button>
        <div className='min-w-0 flex-1 text-center'>
          <h1 className='truncate text-sm font-semibold text-navy'>{title}</h1>
          <p className='text-[11px] text-muted'>{tr.record.saved}</p>
        </div>
        <div className='w-10 shrink-0' aria-hidden='true' />
      </div>

      <div className='mt-2 flex items-center gap-2 overflow-x-auto px-3'>
        <select
          aria-label={tr.home.selectClass}
          value={classId}
          onChange={(e) => chooseClass(Number(e.target.value))}
          className={selectClass}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className='flex shrink-0 rounded-pill bg-header-bg p-0.5' role='group' aria-label={tr.home.semester}>
          {([1, 2] as const).map((s) => (
            <button
              key={s}
              type='button'
              aria-pressed={semester === s}
              onClick={() => chooseSemester(s)}
              className={`rounded-pill px-3 py-1 text-xs font-semibold ${
                semester === s ? 'bg-accent text-surface' : 'text-navy'
              }`}
            >
              {s === 1 ? 'I' : 'II'}
            </button>
          ))}
        </div>
        <button
          type='button'
          onClick={() => {
            window.location.hash = '/';
          }}
          className='shrink-0 rounded-btn border border-line px-3 py-1.5 text-xs font-medium text-navy'
        >
          {tr.home.newClass}
        </button>
      </div>

      <div className='mx-2 mt-2 min-h-0 flex-1 overflow-auto rounded-btn border border-line bg-surface'>
        <table className='border-collapse text-[14px]'>
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  scope='col'
                  className={`sticky top-0 z-20 border-b border-r border-line bg-header-bg px-2 py-2 text-left align-bottom text-xs font-semibold text-navy ${
                    col.kind === 'no' ? 'left-0 z-30 w-12 text-center' : ''
                  } ${col.kind === 'name' ? 'left-12 z-30 min-w-[150px]' : ''} ${
                    col.kind === 'subject' ? 'min-w-[84px] text-center' : ''
                  } ${col.kind === 'total' ? 'w-16 text-center' : ''} ${
                    col.kind === 'remark' ? 'min-w-[120px]' : ''
                  } ${col.kind === 'addSubject' ? 'w-10 text-center text-base' : ''} ${
                    idx === columns.length - 1 ? 'right-0' : ''
                  }`}
                >
                  {col.kind === 'addSubject' ? '+' : headerLabel(col.kind, tr)}
                  {col.kind === 'subject' && (
                    <div className='mt-0.5 text-[10px] font-normal text-muted'>{col.max}</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.studentId ?? `blank-${row.serialNo}`} className='h-11'>
                {columns.map((col) => {
                  const base = 'h-11 border-b border-r border-line px-2 align-middle';
                  if (col.kind === 'no') {
                    return (
                      <td key={col.key} className={`${base} sticky left-0 z-10 w-12 bg-surface text-center text-muted`}>
                        {row.serialNo}
                      </td>
                    );
                  }
                  if (col.kind === 'name') {
                    return (
                      <td key={col.key} className={`${base} sticky left-12 z-10 min-w-[150px] bg-surface text-navy`}>
                        {row.student?.fullName ?? ''}
                      </td>
                    );
                  }
                  if (col.kind === 'sex') {
                    return (
                      <td key={col.key} className={`${base} w-14 text-center`}>
                        {row.student?.sex === 'M' ? tr.record.male : row.student?.sex === 'F' ? tr.record.female : ''}
                      </td>
                    );
                  }
                  if (col.kind === 'age') {
                    return (
                      <td key={col.key} className={`${base} w-14 text-center`}>
                        {row.student?.age ?? ''}
                      </td>
                    );
                  }
                  if (col.kind === 'subject') {
                    return <td key={col.key} className={`${base} min-w-[84px] text-center`} />;
                  }
                  if (col.kind === 'total') {
                    return <td key={col.key} className={`${base} w-16 bg-cell-total text-center`} />;
                  }
                  if (col.kind === 'remark') {
                    return <td key={col.key} className={`${base} min-w-[120px]`} />;
                  }
                  return <td key={col.key} className={`${base} w-10`} />;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {students.length === 0 && (
        <p className='px-4 py-2 text-center text-xs text-muted'>
          {tr.record.emptyNoStudents} - {tr.record.addStudent}
        </p>
      )}
    </div>
  );
}
