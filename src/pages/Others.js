import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { t } from '../i18n';
function Placeholder({ title }) {
    const tr = t();
    return (_jsxs("div", { className: "px-4 pt-24", children: [_jsx("h1", { className: "text-xl font-semibold text-navy", children: title }), _jsx("p", { className: "mt-2 text-sm text-muted", children: tr.placeholder.body })] }));
}
export function Attendance() {
    return _jsx(Placeholder, { title: t().pages.attendance });
}
export function Analytics() {
    return _jsx(Placeholder, { title: t().pages.analytics });
}
export function Settings() {
    return _jsx(Placeholder, { title: t().pages.settings });
}
