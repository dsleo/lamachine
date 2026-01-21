import type { Lang } from '@/lib/i18n';

export type Settings = {
    lang: Lang;
    // Versus-only: controls how strong/robust the Machine is.
    // NOTE: labels in UI: FR Facile/Normal/Difficile, EN Easy/Normal/Hard.
    // Stored as stable ids (no accents).
    versusDifficulty: 'easy' | 'normal' | 'hard';
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

        // Migration:
        // - old version used 'easy'|'hard'
        // - new version uses 'easy'|'normal'|'hard'
        // We map old 'hard' => 'normal' (today's hard becomes the new Normal).
        const rawDiff = (parsed as { versusDifficulty?: unknown }).versusDifficulty;
        const versusDifficulty =
            rawDiff === 'hard'
                ? 'normal'
                : rawDiff === 'normal'
                    ? 'normal'
                    : rawDiff === 'easy'
                        ? 'easy'
                        : 'easy';

        return { lang, versusDifficulty };
    } catch {
        return getDefaultSettings();
    }
}

export function saveSettings(next: Settings) {
    window.localStorage.setItem(KEY, JSON.stringify(next));
}
