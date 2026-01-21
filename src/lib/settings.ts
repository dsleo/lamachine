import type { Lang } from '@/lib/i18n';

export type Settings = {
    lang: Lang;
    // Versus-only: controls how strong/robust the Machine is.
    // NOTE: labels in UI: FR Facile/Normal/Difficile, EN Easy/Normal/Hard.
    // Stored as stable ids (no accents).
    versusDifficulty: 'easy' | 'normal' | 'hard';
};

const KEY_V1 = 'la-machine:settings:v1';
// Bump storage key so we can change defaults without being overridden by old persisted values.
const KEY = 'la-machine:settings:v2';

export function getDefaultSettings(): Settings {
    // Default Machine difficulty: Normal.
    return { lang: 'fr', versusDifficulty: 'normal' };
}

export function loadSettings(): Settings {
    if (typeof window === 'undefined') return getDefaultSettings();
    try {
        const rawV2 = window.localStorage.getItem(KEY);
        const rawV1 = rawV2 ? null : window.localStorage.getItem(KEY_V1);

        // No persisted settings.
        if (!rawV2 && !rawV1) return getDefaultSettings();

        const parsed = JSON.parse((rawV2 ?? rawV1) as string) as Partial<Settings>;
        const lang = parsed.lang === 'en' ? 'en' : 'fr';

        // Migration:
        // - old version used 'easy'|'hard'
        // - new version uses 'easy'|'normal'|'hard'
        // We map old 'hard' => 'normal' (today's hard becomes the new Normal).
        // Additionally, when migrating from v1, we move old 'easy' (previous default)
        // to the new default 'normal'.
        const rawDiff = (parsed as { versusDifficulty?: unknown }).versusDifficulty;
        const fromV1 = !!rawV1;

        const versusDifficulty =
            rawDiff === 'hard'
                ? 'normal'
                : rawDiff === 'normal'
                    ? 'normal'
                    : rawDiff === 'easy'
                        ? (fromV1 ? 'normal' : 'easy')
                        : getDefaultSettings().versusDifficulty;

        const settings = { lang, versusDifficulty } satisfies Settings;

        // Persist in v2 format if we came from v1.
        if (fromV1) {
            window.localStorage.setItem(KEY, JSON.stringify(settings));
        }

        return settings;
    } catch {
        return getDefaultSettings();
    }
}

export function saveSettings(next: Settings) {
    window.localStorage.setItem(KEY, JSON.stringify(next));
}
