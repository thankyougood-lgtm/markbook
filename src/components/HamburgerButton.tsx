import { MenuIcon } from './icons';
import { t } from '../i18n';

export default function HamburgerButton({ onOpen }: { onOpen: () => void }) {
  const tr = t();
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={tr.menu.open}
      className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-surface text-navy shadow-soft"
    >
      <MenuIcon width={24} height={24} />
    </button>
  );
}
