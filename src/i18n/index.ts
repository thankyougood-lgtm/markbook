import { en, type Dict } from './en';
import { am } from './am';
import { om } from './om';

export type Lang = 'en' | 'am' | 'om';

const dicts: Record<Lang, Dict> = { en, am, om };

const STORAGE_KEY = 'markbook.lang';

export function getLang(): Lang {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'en' || raw === 'am' || raw === 'om') return raw;
  } catch {
    // localStorage unavailable
  }
  return 'en';
}

export function setLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // localStorage unavailable
  }
}

export function t(lang: Lang = getLang()): Dict {
  return dicts[lang];
}

export { en, am, om };
export type { Dict };
