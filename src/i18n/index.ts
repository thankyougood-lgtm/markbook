import { en, type Dict } from './en';
import { am } from './am';
import { om } from './om';
import { notifyPreferencesChanged } from '../state/preferences';

export type Lang = 'en' | 'am' | 'om';
const dicts: Record<Lang, Dict> = { en, am, om };
const STORAGE_KEY = 'markbook.lang';
let memoryLang: Lang | undefined;

export function getLang(): Lang {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'en' || raw === 'am' || raw === 'om') { memoryLang = raw; return raw; }
  } catch { /* Use English if storage is unavailable. */ }
  return memoryLang ?? 'en';
}

export function setLang(lang: Lang): void {
  memoryLang = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* Session-only preference. */ }
  document.documentElement.lang = lang;
  notifyPreferencesChanged();
}

export function t(lang: Lang = getLang()): Dict {
  return dicts[lang];
}

export { en, am, om };
export type { Dict };
