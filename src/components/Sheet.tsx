import { useEffect, useRef, type ReactNode } from 'react';

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
        aria-label="Close"
        className="absolute inset-0 bg-[rgba(11,31,92,0.28)]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-t-card bg-surface p-5 shadow-nav sm:rounded-card" style={{ paddingBottom: 'calc(20px + var(--safe-bottom))' }}>
        <h2 className="mb-4 text-lg font-semibold text-navy">{title}</h2>
        {children}
      </div>
    </div>
  );
}
