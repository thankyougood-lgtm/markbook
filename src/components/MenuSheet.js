import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { t } from '../i18n';
const links = [
    { route: 'home', key: 'home' },
    { route: 'add-record', key: 'addRecord' },
    { route: 'attendance', key: 'attendance' },
    { route: 'analytics', key: 'analytics' },
    { route: 'settings', key: 'settings' }
];
export default function MenuSheet({ onClose, onNavigate }) {
    const tr = t();
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape')
                onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (_jsxs("div", { className: "fixed inset-0 z-40", role: "dialog", "aria-modal": "true", "aria-label": tr.menu.open, children: [_jsx("button", { type: "button", className: "absolute inset-0 bg-[rgba(11,31,92,0.25)]", "aria-label": tr.menu.close, onClick: onClose }), _jsxs("nav", { className: "absolute right-4 top-4 w-64 rounded-card bg-surface p-3 shadow-nav", children: [links.map((l) => (_jsx("button", { type: "button", onClick: () => {
                            onNavigate(l.route);
                            onClose();
                        }, className: "block w-full rounded-btn px-4 py-3 text-left text-sm text-navy hover:bg-header-bg", children: tr.pages[l.key] }, l.route))), _jsx("div", { className: "my-2 h-px bg-line" }), _jsx("div", { className: "px-4 py-3 text-sm text-navy", children: tr.menu.export }), _jsx("div", { className: "px-4 py-3 text-sm text-navy", children: tr.menu.backup }), _jsx("div", { className: "px-4 py-3 text-sm text-navy", children: tr.menu.about })] })] }));
}
