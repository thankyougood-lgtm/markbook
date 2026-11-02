import { useEffect } from 'react';
import { t } from '../i18n';
import type { Route } from '../App';

const links: { route: Route; key: 'home' | 'addRecord' | 'attendance' | 'analytics' | 'settings' }[] = [
  { route: 'home', key: 'home' },
  { route: 'add-record', key: 'addRecord' },
  { route: 'attendance', key: 'attendance' },
  { route: 'analytics', key: 'analytics' },
  { route: 'settings', key: 'settings' }
];

export default function MenuSheet({ onClose, onNavigate }: { onClose: () => void; onNavigate: (r: Route) => void }) {
  const tr = t();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={tr.menu.open}>
      <button type="button" className="absolute inset-0 bg-[rgba(11,31,92,0.25)]" aria-label={tr.menu.close} onClick={onClose} />
      <nav className="absolute right-4 top-4 w-64 rounded-card bg-surface p-3 shadow-nav">
        {links.map((l) => (
          <button
            key={l.route}
            type="button"
            onClick={() => {
              onNavigate(l.route);
              onClose();
            }}
            className="block w-full rounded-btn px-4 py-3 text-left text-sm text-navy hover:bg-header-bg"
          >
            {tr.pages[l.key]}
          </button>
        ))}
        <div className="my-2 h-px bg-line" />
        <div className="px-4 py-3 text-sm text-navy">{tr.menu.export}</div>
        <div className="px-4 py-3 text-sm text-navy">{tr.menu.backup}</div>
        <div className="px-4 py-3 text-sm text-navy">{tr.menu.about}</div>
      </nav>
    </div>
  );
}
