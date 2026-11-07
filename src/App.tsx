import { lazy, Suspense, useEffect, useState } from 'react';
import BottomNav from './components/BottomNav';
import HamburgerButton from './components/HamburgerButton';
import MenuSheet from './components/MenuSheet';
import Home from './pages/Home';
import AddRecord from './pages/AddRecord';
import ErrorBoundary from './components/ErrorBoundary';
import Attendance from './pages/Attendance';
import Settings from './pages/Settings';
import { usePreferences } from './state/usePreferences';
import { applyTheme } from './state/preferences';

const Analytics = lazy(() => import('./pages/Analytics'));
export type Route = 'home' | 'add-record' | 'attendance' | 'analytics' | 'settings';
export type SettingsSection = 'backup' | 'about' | null;
const routes: Route[] = ['home', 'add-record', 'attendance', 'analytics', 'settings'];

function routeFromHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  return (routes as string[]).includes(h) ? (h as Route) : 'home';
}

export default function App() {
  const { lang, theme, tr } = usePreferences();
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetEditing, setSheetEditing] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const onHash = () => { setRoute(routeFromHash()); setSheetEditing(false); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    applyTheme(theme);
  }, [lang, theme]);

  const navigate = (r: Route, section: SettingsSection = null) => {
    setSettingsSection(section);
    window.location.hash = r === 'home' ? '/' : `/${r}`;
    setRoute(r);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  };
  const hasOwnHeader = route === 'add-record' || route === 'attendance' || route === 'analytics';
  const fixedHeightRoute = route === 'add-record' || route === 'attendance';

  return (
    <div className="min-h-full" style={fixedHeightRoute ? undefined : { paddingBottom: 'calc(var(--nav-height) + var(--nav-gap) * 2 + var(--safe-bottom))' }}>
      {!hasOwnHeader && <header className="flex items-center justify-end px-4 pt-5"><HamburgerButton onOpen={() => setMenuOpen(true)} /></header>}
      <main key={`${route}-${refreshKey}`}>
        <ErrorBoundary key={route}>
          {route === 'home' && <Home />}
          {route === 'add-record' && <AddRecord onOpenMenu={() => setMenuOpen(true)} onEditingChange={setSheetEditing} />}
          {route === 'attendance' && <Attendance onOpenMenu={() => setMenuOpen(true)} />}
          {route === 'analytics' && <Suspense fallback={<p className="p-6 text-sm text-muted" role="status">{tr.analytics.loading}</p>}><Analytics onOpenMenu={() => setMenuOpen(true)} /></Suspense>}
          {route === 'settings' && <Settings section={settingsSection} onRestored={() => { setRefreshKey((n) => n + 1); navigate('home'); }} />}
        </ErrorBoundary>
      </main>
      {menuOpen && <MenuSheet onClose={() => setMenuOpen(false)} onNavigate={navigate} />}
      {!sheetEditing && <BottomNav route={route} onNavigate={navigate} />}
    </div>
  );
}
