import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': true
} as const;

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        d="M12 3.2 3.5 9.6V20a1 1 0 0 0 1 1h4.6v-4.8a1.6 1.6 0 0 1 3.2 0V21h4.7a1 1 0 0 0 1-1V9.6L12 3.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AddRecordIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8.2v7.6M8.2 12h7.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function AttendanceIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="5.2" width="16" height="15" rx="2.6" stroke="currentColor" strokeWidth="2" />
      <path d="M4 9.6h16" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M8.2 3.2v3.2M15.8 3.2v3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="7" y="12.4" width="2.4" height="2.4" rx="0.6" fill="currentColor" />
      <rect x="7" y="16.2" width="2.4" height="2.4" rx="0.6" fill="currentColor" />
    </svg>
  );
}

export function AnalyticsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="13" width="4" height="7.5" rx="1.6" fill="currentColor" />
      <rect x="10" y="8.5" width="4" height="12" rx="1.6" fill="currentColor" />
      <rect x="16" y="4" width="4" height="16.5" rx="1.6" fill="currentColor" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        d="M12 2.6 14 4l2.3-.3.9 2.2 2 1.2-.4 2.3 1.6 1.7-1.2 2 .3 2.3-2.2.9-1.2 2-2.3-.4-1.7 1.6-2-1.2-2.3.3-.9-2.2-2-1.2.4-2.3L2.6 13l1.2-2-.3-2.3 2.2-.9 1.2-2 2.3.4L12 2.6Z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="3" fill="var(--surface)" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 8h12M6 12h12M6 16h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 6.5 5 11l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 11h8.2a5.3 5.3 0 0 1 0 10.6H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function RedoIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14.5 6.5 19 11l-4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 11h-8.2a5.3 5.3 0 0 0 0 10.6H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function FormatIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5.5 18 10.4 6h1.2L16.5 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.8 14h6.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m17.4 14.6 3.4 3.4-2.2 1.2-1.2 2.2-1.2-1.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="2" />
      <path d="m15.6 15.6 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="5.6" r="1.9" fill="currentColor" />
      <circle cx="12" cy="12" r="1.9" fill="currentColor" />
      <circle cx="12" cy="18.4" r="1.9" fill="currentColor" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5.5v13M5.5 12h13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6.5 9.5 5.5 5.5 5.5-5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExportIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 15.5V4.2M7.8 8.4 12 4.2l4.2 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 13.5v5a1.4 1.4 0 0 0 1.4 1.4h12.2a1.4 1.4 0 0 0 1.4-1.4v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
