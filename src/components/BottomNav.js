import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { t } from '../i18n';
import { AddRecordIcon, AnalyticsIcon, AttendanceIcon, HomeIcon, SettingsIcon } from './icons';
const items = [
    { route: 'home', key: 'home', Icon: HomeIcon },
    { route: 'add-record', key: 'addRecord', Icon: AddRecordIcon },
    { route: 'attendance', key: 'attendance', Icon: AttendanceIcon },
    { route: 'analytics', key: 'analytics', Icon: AnalyticsIcon },
    { route: 'settings', key: 'settings', Icon: SettingsIcon }
];
export default function BottomNav({ route, onNavigate }) {
    const tr = t();
    return (_jsx("nav", { "aria-label": "Primary", className: "fixed inset-x-2 z-30 flex rounded-pill bg-surface-translucent shadow-nav backdrop-blur", style: { bottom: 'calc(var(--nav-gap) + var(--safe-bottom))', height: 'var(--nav-height)' }, children: items.map(({ route: r, key, Icon }) => {
            const active = r === route;
            return (_jsxs("button", { type: "button", onClick: () => onNavigate(r), "aria-current": active ? 'page' : undefined, className: `relative flex flex-1 flex-col items-center justify-center gap-0.5 ${active ? 'font-semibold text-navy' : 'text-nav-inactive'}`, children: [_jsx(Icon, { width: 24, height: 24 }), _jsx("span", { className: "text-[11px] leading-none", children: tr.nav[key] }), active && (_jsx("span", { className: "absolute bottom-0 h-[4px] w-10 rounded-pill bg-accent", "aria-hidden": "true" }))] }, r));
        }) }));
}
