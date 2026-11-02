import { useState, type FormEvent } from 'react';
import { t } from '../i18n';
import type { ClassRow } from '../db/schema';
import { createClass } from '../db/repositories/classes';

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

// Shared by Home and the Add Record class sheet so the fields cannot drift apart.
export default function ClassForm({
  onCreated,
  onCancel
}: {
  onCreated: (created: ClassRow) => void;
  onCancel: () => void;
}) {
  const tr = t();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

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
      setForm(emptyForm);
      onCreated(created);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'mt-1 w-full rounded-btn border border-line bg-surface px-3 py-2 text-sm text-navy outline-none focus:border-accent';

  return (
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
          onClick={onCancel}
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
  );
}
