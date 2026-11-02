import { t } from '../i18n';

function Placeholder({ title }: { title: string }) {
  const tr = t();
  return (
    <div className="px-4 pt-24">
      <h1 className="text-xl font-semibold text-navy">{title}</h1>
      <p className="mt-2 text-sm text-muted">{tr.placeholder.body}</p>
    </div>
  );
}

export function Attendance() {
  return <Placeholder title={t().pages.attendance} />;
}

export function Analytics() {
  return <Placeholder title={t().pages.analytics} />;
}

export function Settings() {
  return <Placeholder title={t().pages.settings} />;
}
