import { t } from '../i18n';

export default function AddRecord() {
  const tr = t();
  return (
    <div className="px-4 pt-24">
      <h1 className="text-xl font-semibold text-navy">{tr.pages.addRecord}</h1>
      <p className="mt-2 text-sm text-muted">{tr.placeholder.body}</p>
    </div>
  );
}
