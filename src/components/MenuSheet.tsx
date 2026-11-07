import { useEffect } from 'react';
import { t } from '../i18n';
import type { Route, SettingsSection } from '../App';

const links: { route: Route; key: 'home' | 'addRecord' | 'attendance' | 'analytics' | 'settings' }[] = [
  { route: 'home', key: 'home' }, { route: 'add-record', key: 'addRecord' },
  { route: 'attendance', key: 'attendance' }, { route: 'analytics', key: 'analytics' },
  { route: 'settings', key: 'settings' }
];

export default function MenuSheet({ onClose, onNavigate }: {
  onClose: () => void;
  onNavigate: (route: Route, section?: SettingsSection) => void;
}) {
  const tr = t();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onPop = () => onClose();
    window.history.pushState({ menu: true }, '');
    window.addEventListener('keydown', onKey);
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('popstate', onPop); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={tr.menu.open}>
      <button type="button" className="absolute inset-0 bg-navy/25" aria-label={tr.common.close} onClick={onClose} />
      <nav className="absolute right-4 top-4 max-h-[85vh] w-64 overflow-y-auto rounded-card bg-surface p-3 shadow-nav">
        <button type="button" onClick={onClose} aria-label={tr.common.close} className="mb-1 ml-auto flex h-11 w-11 items-center justify-center rounded-btn text-xl text-navy">×</button>
        {links.map((l) => <button key={l.route} type="button" onClick={() => onNavigate(l.route)} className="block min-h-[44px] w-full rounded-btn px-4 py-3 text-left text-sm text-navy hover:bg-header-bg">{tr.pages[l.key]}</button>)}
        <div className="my-2 h-px bg-line" />
        <p aria-disabled="true" title={tr.attendance.exportLater} className="px-4 py-3 text-sm text-muted">{tr.menu.export}</p>
        <button type="button" onClick={() => onNavigate('settings', 'backup')} className="block min-h-[44px] w-full rounded-btn px-4 py-3 text-left text-sm text-navy hover:bg-header-bg">{tr.menu.backup}</button>
        <button type="button" onClick={() => onNavigate('settings', 'about')} className="block min-h-[44px] w-full rounded-btn px-4 py-3 text-left text-sm text-navy hover:bg-header-bg">{tr.menu.about}</button>
      </nav>
    </div>
  );
}
