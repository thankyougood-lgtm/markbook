import { useEffect, useState } from 'react';
import Sheet from '../components/Sheet';
import { Button } from '../components/Button';
import ClassForm from '../components/ClassForm';
import { t } from '../i18n';
import { formatClassDisplayName, listClasses } from '../db/repositories/classes';
import type { ClassRow, Semester } from '../db/schema';
import {
  getSelectedClassId,
  getSelectedSemester,
  setSelectedClassId,
  setSelectedSemester
} from '../state/selection';

export default function Home() {
  const tr = t();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState<number | null>(() => getSelectedClassId());
  const [semester, setSemester] = useState<Semester>(() => getSelectedSemester());
  const [sheetOpen, setSheetOpen] = useState(false);

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
              {formatClassDisplayName(c)}
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

        <Button
          type="button"
          variant="secondary"
          onClick={() => setSheetOpen(true)}
          className="mt-5 h-9 px-4 text-sm"
        >
          {tr.home.newClass}
        </Button>
      </section>

      {sheetOpen && (
        <Sheet title={tr.home.formTitle} onClose={() => setSheetOpen(false)}>
          <ClassForm
            onCancel={() => setSheetOpen(false)}
            onCreated={(created) => {
              setClasses((rows) => [...rows, created]);
              chooseClass(created.id);
              setSheetOpen(false);
            }}
          />
        </Sheet>
      )}
    </div>
  );
}
