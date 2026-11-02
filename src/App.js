import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import BottomNav from './components/BottomNav';
import HamburgerButton from './components/HamburgerButton';
import MenuSheet from './components/MenuSheet';
import Home from './pages/Home';
import AddRecord from './pages/AddRecord';
import { Analytics, Attendance, Settings } from './pages/Others';
const routes = ['home', 'add-record', 'attendance', 'analytics', 'settings'];
function routeFromHash() {
    const h = window.location.hash.replace(/^#\/?/, '');
    return routes.includes(h) ? h : 'home';
}
export default function App() {
    const [route, setRoute] = useState(routeFromHash);
    const [menuOpen, setMenuOpen] = useState(false);
    useEffect(() => {
        const onHash = () => setRoute(routeFromHash());
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);
    const navigate = (r) => {
        window.location.hash = r === 'home' ? '/' : `/${r}`;
        setRoute(r);
    };
    return (_jsxs("div", { className: "min-h-full", style: { paddingBottom: 'calc(var(--nav-height) + var(--nav-gap) * 2 + var(--safe-bottom))' }, children: [_jsx("header", { className: "flex items-center justify-end px-4 pt-5", children: _jsx(HamburgerButton, { onOpen: () => setMenuOpen(true) }) }), _jsxs("main", { children: [route === 'home' && _jsx(Home, {}), route === 'add-record' && _jsx(AddRecord, {}), route === 'attendance' && _jsx(Attendance, {}), route === 'analytics' && _jsx(Analytics, {}), route === 'settings' && _jsx(Settings, {})] }), menuOpen && _jsx(MenuSheet, { onClose: () => setMenuOpen(false), onNavigate: navigate }), _jsx(BottomNav, { route: route, onNavigate: navigate })] }));
}
