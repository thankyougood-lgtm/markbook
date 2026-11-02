import { useEffect, useState } from 'react';
import BottomNav from './components/BottomNav';
import HamburgerButton from './components/HamburgerButton';
import MenuSheet from './components/MenuSheet';
import Home from './pages/Home';
import AddRecord from './pages/AddRecord';
import ErrorBoundary from './components/ErrorBoundary';
import { Analytics, Attendance, Settings } from './pages/Others';

export type Route = 'home' | 'add-record' | 'attendance' | 'analytics' | 'settings';

const routes: Route[] = ['home', 'add-record', 'attendance', 'analytics', 'settings'];

function routeFromHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  return (routes as string[]).includes(h) ? (h as Route) : 'home';
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (r: Route) => {
    window.location.hash = r === 'home' ? '/' : `/${r}`;
    setRoute(r);
  };

  return (
    <div className="min-h-full" style={{ paddingBottom: 'calc(var(--nav-height) + var(--nav-gap) * 2 + var(--safe-bottom))' }}>
      {route !== 'add-record' && (
        <header className="flex items-center justify-end px-4 pt-5">
          <HamburgerButton onOpen={() => setMenuOpen(true)} />
        </header>
      )}

      <main>
        {route === 'home' && <Home />}
        {route === 'add-record' && (
          <ErrorBoundary>
            <AddRecord onOpenMenu={() => setMenuOpen(true)} />
          </ErrorBoundary>
        )}
        {route === 'attendance' && <Attendance />}
        {route === 'analytics' && <Analytics />}
        {route === 'settings' && <Settings />}
      </main>

      {menuOpen && <MenuSheet onClose={() => setMenuOpen(false)} onNavigate={navigate} />}
      <BottomNav route={route} onNavigate={navigate} />
    </div>
  );
}
