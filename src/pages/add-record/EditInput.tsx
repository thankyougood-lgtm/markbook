import { useEffect, useRef } from 'react';

export default function EditInput({
  value,
  onChange,
  inputMode,
  onDone
}: {
  value: string;
  onChange: (v: string) => void;
  inputMode: 'text' | 'numeric' | 'decimal';
  onDone: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  return (
    <input
      ref={ref}
      value={value}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onDone();
        }
      }}
      className='h-9 w-full min-w-0 rounded-[6px] border border-accent bg-surface px-1 text-[14px] text-navy outline-none'
    />
  );
}
