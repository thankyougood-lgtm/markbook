import { useEffect, useRef, type ReactNode } from 'react';
import { t } from '../i18n';

export default function Sheet({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    window.history.pushState({ sheet: true }, '');
    const onPop = () => closeRef.current();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label={t().common.close}
        className="absolute inset-0 bg-[rgba(11,31,92,0.28)]"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-card bg-surface p-5 shadow-nav sm:rounded-card" style={{ paddingBottom: 'calc(20px + var(--safe-bottom))' }}>
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-navy">{title}</h2><button type="button" onClick={onClose} aria-label={t().common.close} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn text-xl text-navy">×</button></div>
        {children}
      </div>
    </div>
  );
}
