import type { Lang } from '@/lib/i18n';

export type Settings = {
    lang: Lang;
    // Versus-only: controls how strong/robust the Machine is.
    versusDifficulty: 'easy' | 'hard';
};

const KEY = 'la-machine:settings:v1';

export function getDefaultSettings(): Settings {
    return { lang: 'fr', versusDifficulty: 'easy' };
}

export function loadSettings(): Settings {
    if (typeof window === 'undefined') return getDefaultSettings();
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return getDefaultSettings();
        const parsed = JSON.parse(raw) as Partial<Settings>;
        const lang = parsed.lang === 'en' ? 'en' : 'fr';
        const versusDifficulty = parsed.versusDifficulty === 'hard' ? 'hard' : 'easy';
        return { lang, versusDifficulty };
    } catch {
        return getDefaultSettings();
    }
}

export function saveSettings(next: Settings) {
    window.localStorage.setItem(KEY, JSON.stringify(next));
}
