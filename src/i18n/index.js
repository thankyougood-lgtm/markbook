import { en } from './en';
import { am } from './am';
import { om } from './om';
const dicts = { en, am, om };
const STORAGE_KEY = 'markbook.lang';
export function getLang() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === 'en' || raw === 'am' || raw === 'om')
            return raw;
    }
    catch {
        // localStorage unavailable
    }
    return 'en';
}
export function setLang(lang) {
    try {
        localStorage.setItem(STORAGE_KEY, lang);
    }
    catch {
        // localStorage unavailable
    }
}
export function t(lang = getLang()) {
    return dicts[lang];
}
export { en, am, om };
