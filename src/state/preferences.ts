export type Theme = 'light' | 'dark';
export const PREFERENCES_EVENT = 'markbook:preferences';
const THEME_KEY = 'markbook.theme';
let memoryTheme: Theme | undefined;

export function notifyPreferencesChanged(): void {
  window.dispatchEvent(new Event(PREFERENCES_EVENT));
}

export function getTheme(): Theme {
  if (memoryTheme) return memoryTheme;
  try {
    memoryTheme = localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    memoryTheme = 'light';
  }
  return memoryTheme;
}

export function applyTheme(theme: Theme = getTheme()): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  );
}

export function setTheme(theme: Theme): void {
  memoryTheme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* Session-only preference. */ }
  applyTheme(theme);
  notifyPreferencesChanged();
}

export function subscribePreferences(listener: () => void): () => void {
  const storage = (event: StorageEvent) => {
    if (event.key === 'markbook.lang' || event.key === THEME_KEY || event.key === null) {
      memoryTheme = undefined;
      listener();
    }
  };
  window.addEventListener(PREFERENCES_EVENT, listener);
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener(PREFERENCES_EVENT, listener);
    window.removeEventListener('storage', storage);
  };
}
