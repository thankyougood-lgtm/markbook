import { t } from '../i18n';

// Placeholder while the spreadsheet is rebuilt. The old UI was removed on purpose
// (safety point 0ba387a); this page is replaced in stage 1 of the rewrite.
export default function AddRecord() {
  const tr = t();
  return (
    <div className='px-4 pt-6'>
      <section className='rounded-card bg-surface p-6 text-center shadow-soft'>
        <h1 className='text-base font-semibold text-navy'>{tr.pages.addRecord}</h1>
        <p className='mt-2 text-sm text-muted'>{tr.placeholder.body}</p>
      </section>
    </div>
  );
}
