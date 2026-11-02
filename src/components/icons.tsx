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

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14.5 6.5 9 12l5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 6.5 15 12l-5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KeyboardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6.5" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M6.5 10h1M10 10h1M13.5 10h1M17 10h1M6.5 13.5h1M10 13.5h4M16 13.5h1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function HideKeyboardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6.5" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m4.5 19.5 15-15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="8" y="8" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M16 8V6.5A1.5 1.5 0 0 0 14.5 5h-8A1.5 1.5 0 0 0 5 6.5v8A1.5 1.5 0 0 0 6.5 16H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ScissorsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="7" cy="17" r="2.6" stroke="currentColor" strokeWidth="2" />
      <circle cx="17" cy="17" r="2.6" stroke="currentColor" strokeWidth="2" />
      <path d="M9 15 18 4.5M15 15 6 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PasteIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="5" width="14" height="15.5" rx="2.2" stroke="currentColor" strokeWidth="2" />
      <path d="M9 5V4.2A1.2 1.2 0 0 1 10.2 3h3.6A1.2 1.2 0 0 1 15 4.2V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function SortIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 19V5M8 5 5 8.2M8 5l3 3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 5v14M16 19l-3-3.2M16 19l3-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 6h15l-5.8 6.6V19l-3.4-2v-4.4L4.5 6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function FillColorIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m9 4.5 8.5 8.5-6 6L4 11.5l5-7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M19.5 15.5c1 1.2 1.5 2 1.5 2.8a1.6 1.6 0 0 1-3.2 0c0-.8.6-1.6 1.7-2.8Z" fill="currentColor" />
    </svg>
  );
}

export function DecimalsDownIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8h6M4 12h4.5M4 16h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16.5 6v11M16.5 17l-2.6-2.6M16.5 17l2.6-2.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DecimalsUpIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8h6M4 12h4.5M4 16h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16.5 17V6M16.5 6l-2.6 2.6M16.5 6l2.6 2.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DeleteIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 7h14M10 7V5.5A1.5 1.5 0 0 1 11.5 4h1A1.5 1.5 0 0 1 14 5.5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 7l.9 11.3A1.8 1.8 0 0 0 9.7 20h4.6a1.8 1.8 0 0 0 1.8-1.7L17 7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function MergeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M12 4v16M4 12h4M16 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function BoldIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7.5 4.5h5.2a3.8 3.8 0 0 1 0 7.6H7.5Zm0 7.6h6a4 4 0 0 1 0 8h-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function ItalicIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10 4.5h8M6 19.5h8M14 4.5 10 19.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function AlignLeftIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6.5h16M4 11h10M4 15.5h16M4 20h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function AlignCenterIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6.5h16M7 11h10M4 15.5h16M7 20h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function AlignRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6.5h16M10 11h10M4 15.5h16M10 20h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m5.5 12.5 4.2 4.2 8.8-9.4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function PeopleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9.5" cy="8.5" r="3.2" stroke="currentColor" strokeWidth="2" />
      <path d="M3.5 19.5c0-3.1 2.7-5.2 6-5.2s6 2.1 6 5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 6.2a2.9 2.9 0 0 1 0 5.6M18 14.8c1.7.7 2.8 2.2 2.8 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
