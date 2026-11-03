import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';

const baseClass =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50';

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-surface shadow-soft hover:brightness-[0.98] disabled:bg-accent/60 disabled:shadow-none',
  secondary:
    'border border-accent/30 bg-surface text-accent shadow-soft hover:bg-header-bg disabled:border-line disabled:text-muted disabled:shadow-none',
  quiet: 'text-navy hover:bg-header-bg disabled:text-muted'
};

export function Button({
  children,
  className = '',
  variant = 'primary',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
}) {
  return (
    <button type={type} className={`${baseClass} ${variantClass[variant]} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
