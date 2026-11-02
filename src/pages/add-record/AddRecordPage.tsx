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
import {
  EXTRA_BLANK_ROWS,
  INITIAL_BLANK_ROWS,
  buildColumns,
  buildRows,
  parseSex,
  scoreKey,
  type ColKind
} from './model';
import { addStudent, updateStudent } from '../../db/repositories/students';
import { setScore } from '../../db/repositories/scores';
import { setRemark } from '../../db/repositories/semesters';
import { calcTotal, parseAge, parseScore, type CellError } from '../../lib/grid';
import { ExportIcon } from '../../components/icons';
import EditInput from './EditInput';

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
  const [blankRows, setBlankRows] = useState(INITIAL_BLANK_ROWS);
  const [active, setActive] = useState<{ row: number; col: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [cellError, setCellError] = useState<CellError | null>(null);
  const [sexPickerRow, setSexPickerRow] = useState<number | null>(null);

  useEffect(() => {
    void listClasses().then(setClasses);
  }, []);

  const { subjects, students, scores, reload, markSaving } = useSheet(classId, semester);
  const columns = useMemo(() => buildColumns(subjects), [subjects]);
  const rows = useMemo(
    () => buildRows(students, Math.max(INITIAL_BLANK_ROWS, blankRows - students.length)),
    [students, blankRows]
  );

  useEffect(() => {
    setActive(null);
    setEditing(false);
  }, [classId, semester]);

  const chooseClass = (id: number | null) => {
    setClassId(id);
    setSelectedClassId(id);
  };

  const chooseSemester = (s: Semester) => {
    setSemester(s);
    setSelectedSemester(s);
  };

  const cellRaw = (rowIdx: number, col: typeof columns[number]): string => {
    const row = rows[rowIdx];
    if (!row) return '';
    const student = row.student;
    switch (col.kind) {
      case 'name':
        return student?.fullName ?? '';
      case 'sex':
        return student?.sex ?? '';
      case 'age':
        return student?.age === null || student?.age === undefined ? '' : String(student.age);
      case 'subject': {
        if (!student || col.subjectId === undefined) return '';
        const v = scores.get(scoreKey(student.id, col.subjectId));
        return v === null || v === undefined ? '' : String(v);
      }
      default:
        return '';
    }
  };

  const rowTotal = (rowIdx: number): number | null => {
    const row = rows[rowIdx];
    if (!row?.student) return null;
    return calcTotal(
      subjects.map((s) => scores.get(scoreKey(row.student!.id, s.id)))
    );
  };

  const startEdit = (row: number, col: number, initial?: string) => {
    setActive({ row, col });
    setEditing(true);
    setCellError(null);
    setEditValue(initial ?? cellRaw(row, columns[col]));
  };

  const validate = (col: number, raw: string): { ok: true; value: string | number | null } | { ok: false; error: CellError } => {
    const column = columns[col];
    if (column.kind === 'age') return parseAge(raw);
    if (column.kind === 'subject') return parseScore(raw, column.max ?? 100);
    if (column.kind === 'sex') {
      const sex = parseSex(raw);
      if (sex === undefined) return { ok: false, error: 'invalidScore' };
      return { ok: true, value: sex };
    }
    return { ok: true, value: raw };
  };

  const commitCell = async (rowIdx: number, colIdx: number, raw: string): Promise<boolean> => {
    const column = columns[colIdx];
    if (!column || classId === null) return false;
    const checked = validate(colIdx, raw);
    if (!checked.ok) {
      setCellError(checked.error);
      return false;
    }
    const row = rows[rowIdx];
    markSaving();
    if (row.studentId === null) {
      if (checked.value === null || checked.value === '') {
        setEditing(false);
        setCellError(null);
        return true;
      }
      const studentId = await addStudent(classId, {
        fullName: column.kind === 'name' ? String(checked.value) : '',
        sex: column.kind === 'sex' ? (checked.value as 'M' | 'F' | null) : null,
        age: column.kind === 'age' ? (checked.value as number | null) : null,
        serialNo: row.serialNo,
        order: row.serialNo - 1
      });
      if (column.kind === 'subject' && column.subjectId !== undefined) {
        await setScore(studentId, semester, column.subjectId, checked.value as number | null);
      }
      if (column.kind === 'remark') {
        await setRemark(studentId, semester, String(checked.value));
      }
      await reload();
    } else if (column.kind === 'name') {
      await updateStudent(row.studentId, { fullName: String(checked.value) });
      await reload();
    } else if (column.kind === 'sex') {
      await updateStudent(row.studentId, { sex: checked.value as 'M' | 'F' | null });
      await reload();
    } else if (column.kind === 'age') {
      await updateStudent(row.studentId, { age: checked.value as number | null });
      await reload();
    } else if (column.kind === 'subject' && column.subjectId !== undefined) {
      await setScore(row.studentId, semester, column.subjectId, checked.value as number | null);
      await reload();
    } else if (column.kind === 'remark') {
      await setRemark(row.studentId, semester, String(checked.value));
      await reload();
    }
    setEditing(false);
    setCellError(null);
    if (rowIdx + EXTRA_BLANK_ROWS >= rows.length) setBlankRows((n) => n + EXTRA_BLANK_ROWS);
    return true;
  };

  const onCellPointerDown = (rowIdx: number, colIdx: number) => {
    const column = columns[colIdx];
    if (!column) return;
    if (column.kind === 'sex') {
      if (editing && active?.row === rowIdx && active.col === colIdx) return;
      setActive({ row: rowIdx, col: colIdx });
      setEditing(false);
      setSexPickerRow(rowIdx);
      return;
    }
    if (column.kind !== 'name' && column.kind !== 'age' && column.kind !== 'subject' && column.kind !== 'remark') return;
    if (editing && active?.row === rowIdx && active.col === colIdx) return;
    startEdit(rowIdx, colIdx);
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

      {editing && (
        <div className='mt-2 flex items-center justify-end gap-2 px-3'>
          {cellError && <span className='mr-auto text-xs text-danger'>{tr.record[cellError]}</span>}
          <button
            type='button'
            aria-label={tr.record.cancelEdit}
            onClick={() => {
              setEditing(false);
              setCellError(null);
            }}
            className='flex h-10 w-10 items-center justify-center rounded-pill bg-danger text-surface'
          >
            X
          </button>
          <button
            type='button'
            aria-label={tr.record.confirmEdit}
            disabled={cellError !== null}
            onClick={() => {
              if (active) void commitCell(active.row, active.col, editValue);
            }}
            className='flex h-10 w-10 items-center justify-center rounded-pill bg-success text-surface disabled:opacity-50'
          >
            OK
          </button>
        </div>
      )}

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
            {rows.map((row, rowIdx) => (
              <tr key={row.studentId ?? `blank-${row.serialNo}`} className='h-11'>
                {columns.map((col, colIdx) => {
                  const isActive = active?.row === rowIdx && active.col === colIdx;
                  const isEditing = isActive && editing;
                  const ring = isActive ? 'relative z-10 outline outline-2 -outline-offset-2 outline-accent' : '';
                  const base = `h-11 border-b border-r border-line px-2 align-middle ${ring}`;
                  if (col.kind === 'no') {
                    return (
                      <td key={col.key} className={`${base} sticky left-0 z-10 w-12 bg-surface text-center text-muted`}>
                        {row.serialNo}
                      </td>
                    );
                  }
                  const done = () => void commitCell(rowIdx, colIdx, editValue);
                  if (col.kind === 'name') {
                    return (
                      <td key={col.key} className={`${base} sticky left-12 z-10 min-w-[150px] bg-surface text-navy`} onPointerDown={() => onCellPointerDown(rowIdx, colIdx)}>
                        {isEditing ? (
                          <EditInput value={editValue} onChange={setEditValue} inputMode='text' onDone={done} />
                        ) : (
                          row.student?.fullName ?? ''
                        )}
                      </td>
                    );
                  }
                  if (col.kind === 'sex') {
                    return (
                      <td
                        key={col.key}
                        tabIndex={0}
                        className={`${base} w-14 text-center`}
                        onPointerDown={() => onCellPointerDown(rowIdx, colIdx)}
                        onKeyDown={(e) => {
                          const key = e.key.toLowerCase();
                          if (key === 'm' || key === 'f') {
                            e.preventDefault();
                            setSexPickerRow(null);
                            void commitCell(rowIdx, colIdx, key);
                          }
                        }}
                      >
                        {row.student?.sex === 'M' ? tr.record.male : row.student?.sex === 'F' ? tr.record.female : ''}
                        {sexPickerRow === rowIdx && (
                          <div className='absolute z-30 mt-1 flex rounded-btn bg-surface shadow-nav'>
                            {(['M', 'F'] as const).map((sex) => (
                              <button
                                key={sex}
                                type='button'
                                className='px-4 py-3 text-sm font-semibold text-navy'
                                onClick={() => {
                                  setSexPickerRow(null);
                                  void commitCell(rowIdx, colIdx, sex);
                                }}
                              >
                                {sex === 'M' ? tr.record.male : tr.record.female}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  }
                  if (col.kind === 'age') {
                    return (
                      <td key={col.key} className={`${base} w-14 text-center`} onPointerDown={() => onCellPointerDown(rowIdx, colIdx)}>
                        {isEditing ? (
                          <EditInput value={editValue} onChange={setEditValue} inputMode='numeric' onDone={done} />
                        ) : (
                          row.student?.age ?? ''
                        )}
                      </td>
                    );
                  }
                  if (col.kind === 'subject') {
                    return (
                      <td key={col.key} className={`${base} min-w-[84px] text-center`} onPointerDown={() => onCellPointerDown(rowIdx, colIdx)}>
                        {isEditing ? (
                          <EditInput value={editValue} onChange={setEditValue} inputMode='decimal' onDone={done} />
                        ) : (
                          cellRaw(rowIdx, col)
                        )}
                      </td>
                    );
                  }
                  if (col.kind === 'total') {
                    return (
                      <td key={col.key} className={`${base} w-16 bg-cell-total text-center font-semibold`}>
                        {rowTotal(rowIdx) ?? ''}
                      </td>
                    );
                  }
                  if (col.kind === 'remark') {
                    return (
                      <td key={col.key} className={`${base} min-w-[120px]`} onPointerDown={() => onCellPointerDown(rowIdx, colIdx)}>
                        {isEditing ? (
                          <EditInput value={editValue} onChange={setEditValue} inputMode='text' onDone={done} />
                        ) : null}
                      </td>
                    );
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
