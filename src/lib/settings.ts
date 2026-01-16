import type { Lang } from '@/lib/i18n';

export type Settings = {
    lang: Lang;
};

const KEY = 'la-machine:settings:v1';

export function getDefaultSettings(): Settings {
    return { lang: 'fr' };
}

export function loadSettings(): Settings {
    if (typeof window === 'undefined') return getDefaultSettings();
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return getDefaultSettings();
        const parsed = JSON.parse(raw) as Partial<Settings>;
        const lang = parsed.lang === 'en' ? 'en' : 'fr';
        return { lang };
    } catch {
        return getDefaultSettings();
    }
}

export function saveSettings(next: Settings) {
    window.localStorage.setItem(KEY, JSON.stringify(next));
}

