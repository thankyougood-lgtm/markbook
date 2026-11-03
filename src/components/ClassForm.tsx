import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { t } from '../i18n';
import type { ClassRow, Semester } from '../db/schema';
import { createClass, generateClassName, listClasses } from '../db/repositories/classes';
import { setSelectedSemester } from '../state/selection';
import { Button } from './Button';

type FormState = {
  grade: string;
  section: string;
  academicYear: string;
  semester: Semester;
};

const emptyForm: FormState = {
  grade: '',
  section: '',
  academicYear: '',
  semester: 1
};

// Shared by Home and the Add Record class sheet so the fields cannot drift apart.
export default function ClassForm({
  onCreated,
  onCancel
}: {
  onCreated: (created: ClassRow) => void;
  onCancel: () => void;
}) {
  const tr = t();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>({
    grade: false,
    section: false,
    academicYear: false,
    semester: false
  });

  useEffect(() => {
    void listClasses().then(setClasses);
  }, []);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setTouched((current) => ({ ...current, [key]: true }));
  };

  const duplicateError = useMemo(() => {
    const grade = form.grade.trim().toLowerCase();
    const section = form.section.trim().toLowerCase();
    const academicYear = form.academicYear.trim().toLowerCase();

    if (!grade || !section || !academicYear) return '';

    const duplicate = classes.some((existing) => {
      const existingGrade = (existing.grade ?? '').trim().toLowerCase();
      const existingSection = (existing.section ?? '').trim().toLowerCase();
      const existingYear = (existing.academicYear ?? '').trim().toLowerCase();
      return (
        existing.archivedAt === null &&
        existingGrade === grade &&
        existingSection === section &&
        existingYear === academicYear
      );
    });

    return duplicate ? tr.home.duplicateClass : '';
  }, [classes, form.academicYear, form.grade, form.section, tr.home.duplicateClass]);

  const canSave =
    form.grade.trim() !== '' &&
    form.section.trim() !== '' &&
    form.academicYear.trim() !== '' &&
    !duplicateError &&
    !submitting;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSave) {
      setTouched({ grade: true, section: true, academicYear: true, semester: true });
      return;
    }

    setSubmitting(true);
    try {
      const created = await createClass({
        name: generateClassName(form.grade, form.section),
        grade: form.grade.trim(),
        section: form.section.trim(),
        academicYear: form.academicYear.trim(),
        schoolName: '',
        teacherName: ''
      });
      setSelectedSemester(form.semester);
      setForm({ ...emptyForm, semester: form.semester });
      setTouched({ grade: false, section: false, academicYear: false, semester: false });
      onCreated(created);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'mt-1 w-full rounded-btn border border-line bg-surface px-3 py-2 text-sm text-navy outline-none focus:border-accent';

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-sm text-navy">
        {tr.home.grade}
        <input
          className={inputClass}
          value={form.grade}
          onChange={(e) => updateField('grade', e.target.value)}
          required
          autoComplete="off"
          maxLength={10}
          inputMode="numeric"
          aria-label={tr.home.grade}
        />
        {touched.grade && form.grade.trim() === '' && <span className="mt-1 block text-[11px] text-danger">{tr.home.required}</span>}
      </label>

      <label className="block text-sm text-navy">
        {tr.home.section}
        <input
          className={inputClass}
          value={form.section}
          onChange={(e) => updateField('section', e.target.value.toUpperCase())}
          required
          autoComplete="off"
          maxLength={6}
          aria-label={tr.home.section}
        />
        {touched.section && form.section.trim() === '' && <span className="mt-1 block text-[11px] text-danger">{tr.home.required}</span>}
      </label>

      <div className="block text-sm text-navy">
        <span className="block">{tr.home.semester}</span>
        <div
          role="group"
          aria-label={tr.home.semester}
          className="mt-1 flex rounded-pill bg-header-bg p-1"
        >
          {([1, 2] as const).map((semester) => (
            <button
              key={semester}
              type="button"
              aria-pressed={form.semester === semester}
              onClick={() => updateField('semester', semester)}
              className={`flex-1 rounded-pill py-2 text-sm font-semibold ${
                form.semester === semester ? 'bg-accent text-surface shadow-soft' : 'text-navy'
              }`}
            >
              {semester === 1 ? 'I' : 'II'}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-sm text-navy">
        {tr.home.academicYear}
        <input
          className={inputClass}
          value={form.academicYear}
          onChange={(e) => updateField('academicYear', e.target.value)}
          required
          autoComplete="off"
          maxLength={12}
          placeholder="2018 EC"
          aria-label={tr.home.academicYear}
        />
        {touched.academicYear && form.academicYear.trim() === '' && <span className="mt-1 block text-[11px] text-danger">{tr.home.required}</span>}
      </label>

      {duplicateError && <p className="text-xs text-danger">{duplicateError}</p>}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="quiet" onClick={onCancel} className="px-4">
          {tr.common.cancel}
        </Button>
        <Button type="submit" variant="primary" disabled={!canSave} className="px-5">
          {tr.common.save}
        </Button>
      </div>
    </form>
  );
}
