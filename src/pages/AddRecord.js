import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { t } from '../i18n';
export default function AddRecord() {
    const tr = t();
    return (_jsxs("div", { className: "px-4 pt-24", children: [_jsx("h1", { className: "text-xl font-semibold text-navy", children: tr.pages.addRecord }), _jsx("p", { className: "mt-2 text-sm text-muted", children: tr.placeholder.body })] }));
}
