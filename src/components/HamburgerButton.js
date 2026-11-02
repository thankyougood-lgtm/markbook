import { jsx as _jsx } from "react/jsx-runtime";
import { MenuIcon } from './icons';
import { t } from '../i18n';
export default function HamburgerButton({ onOpen }) {
    const tr = t();
    return (_jsx("button", { type: "button", onClick: onOpen, "aria-label": tr.menu.open, className: "flex h-12 w-12 items-center justify-center rounded-[16px] bg-surface text-navy shadow-soft", children: _jsx(MenuIcon, { width: 24, height: 24 }) }));
}
