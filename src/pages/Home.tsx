import { useEffect, useState, type FormEvent } from 'react';
import Sheet from '../components/Sheet';
import { t } from '../i18n';
import { createClass, listClasses } from '../db/repositories/classes';
import type { ClassRow, Semester } from '../db/schema';
import {
  getSelectedClassId,
  getSelectedSemester,
  setSelectedClassId,
  setSelectedSemester
} from '../state/selection';

const formLabels = {
  name: 'className',
  grade: 'grade',
  section: 'section',
  academicYear: 'academicYear',
  schoolName: 'schoolName',
  teacherName: 'teacherName'
} as const;

const emptyForm = {
  name: '',
  grade: '',
  section: '',
  academicYear: '',
  schoolName: '',
  teacherName: ''
};

export default function Home() {
  const tr = t();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState<number | null>(() => getSelectedClassId());
  const [semester, setSemester] = useState<Semester>(() => getSelectedSemester());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    void listClasses().then((rows) => {
      if (!alive) return;
      setClasses(rows);
      setClassId((current) =>
        current !== null && rows.some((r) => r.id === current) ? current : rows[0]?.id ?? null
      );
    });
    return () => {
      alive = false;
    };
  }, []);

  const chooseClass = (id: number | null) => {
    setClassId(id);
    setSelectedClassId(id);
  };

  const chooseSemester = (s: Semester) => {
    setSemester(s);
    setSelectedSemester(s);
  };

  const field = (key: keyof typeof emptyForm) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const canSave = Object.values(form).every((v) => v.trim() !== '');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSave || submitting) return;
    setSubmitting(true);
    try {
      const created = await createClass({
        name: form.name.trim(),
        grade: form.grade.trim(),
        section: form.section.trim(),
        academicYear: form.academicYear.trim(),
        schoolName: form.schoolName.trim(),
        teacherName: form.teacherName.trim()
      });
      setClasses((rows) => [...rows, created]);
      chooseClass(created.id);
      setForm(emptyForm);
      setSheetOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'mt-1 w-full rounded-btn border border-line bg-surface px-3 py-2 text-sm text-navy outline-none focus:border-accent';

  return (
    <div className="px-4 pt-4">
      <section className="rounded-card bg-surface p-5 shadow-soft">
        <label className="block text-xs font-medium text-muted" htmlFor="class-select">
          {tr.home.selectClass}
        </label>
        <select
          id="class-select"
          value={classId ?? ''}
          onChange={(e) => chooseClass(e.target.value === '' ? null : Number(e.target.value))}
          className="mt-1 w-full rounded-btn border border-line bg-surface px-3 py-3 text-sm font-medium text-navy outline-none focus:border-accent"
        >
          <option value="">{tr.home.selectClass}</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="mt-4">
          <span className="block text-xs font-medium text-muted">{tr.home.semester}</span>
          <div className="mt-1 flex rounded-pill bg-header-bg p-1" role="group" aria-label={tr.home.semester}>
            {([1, 2] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={semester === s}
                onClick={() => chooseSemester(s)}
                className={`flex-1 rounded-pill py-2 text-sm font-semibold ${
                  semester === s ? 'bg-accent text-surface shadow-soft' : 'text-navy'
                }`}
              >
                {s === 1 ? 'I' : 'II'}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="mt-5 w-full rounded-btn bg-accent py-3 text-sm font-semibold text-surface shadow-soft"
        >
          {tr.home.newClass}
        </button>
      </section>

      {sheetOpen && (
        <Sheet title={tr.home.formTitle} onClose={() => setSheetOpen(false)}>
          <form onSubmit={onSubmit} className="space-y-3">
            {(Object.keys(emptyForm) as (keyof typeof emptyForm)[]).map((key) => (
              <label key={key} className="block text-sm text-navy">
                {tr.home[formLabels[key]]}
                <input
                  className={inputClass}
                  value={form[key]}
                  onChange={field(key)}
                  required
                  autoComplete="off"
                />
              </label>
            ))}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="flex-1 rounded-btn border border-line py-3 text-sm font-medium text-navy"
              >
                {tr.common.cancel}
              </button>
              <button
                type="submit"
                disabled={!canSave || submitting}
                className="flex-1 rounded-btn bg-accent py-3 text-sm font-semibold text-surface disabled:opacity-50"
              >
                {tr.common.save}
              </button>
            </div>
          </form>
        </Sheet>
      )}
    </div>
  );
}
