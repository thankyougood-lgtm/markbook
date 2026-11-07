import { useSyncExternalStore } from 'react';
import { getLang, t } from '../i18n';
import { getTheme, subscribePreferences } from './preferences';

/** Re-render the whole route when language/theme changes, without a reload. */
export function usePreferences() {
  const snapshot = useSyncExternalStore(
    subscribePreferences,
    () => `${getLang()}:${getTheme()}`,
    () => 'en:light'
  );
  const [lang, theme] = snapshot.split(':') as [ReturnType<typeof getLang>, ReturnType<typeof getTheme>];
  return { lang, theme, tr: t(lang) };
}
