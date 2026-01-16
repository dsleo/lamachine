import type { Lang } from '@/lib/i18n';
import type { ConstraintId } from '@/lib/constraints';

export type DailyMode = 'coach' | 'versus';

export type DailyChallenge = {
    dayKey: string; // YYYY-MM-DD (Europe/Paris)
    constraintId: ConstraintId;
    param: string;
};

/**
 * Return YYYY-MM-DD for Europe/Paris.
 * Uses Intl so it works in both Node and browsers.
 */
export function getParisDayKey(date = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Paris',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);
    const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

// Curated pool. Keep it simple and stable.
const DAILY_POOL: Array<Omit<DailyChallenge, 'dayKey'>> = [
    // Keep daily constraints within the deterministic set implemented in src/lib/constraints.ts
    { constraintId: 'lipogram', param: 'e' },
    { constraintId: 'lipogram', param: 'a' },
    { constraintId: 'lipogram', param: 's' },
    { constraintId: 'monovocalism', param: 'a' },
    { constraintId: 'tautogram', param: 'm' },
    { constraintId: 'alliteration', param: 'p' },
    { constraintId: 'snowball', param: '' },
    { constraintId: 'beau-present', param: 'GEORGES PEREC' },
];

function hashToIndex(dayKey: string, size: number): number {
    // Small deterministic hash (FNV-ish)
    let h = 2166136261;
    for (let i = 0; i < dayKey.length; i++) {
        h ^= dayKey.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    // Ensure positive
    return Math.abs(h) % size;
}

export function getDailyChallenge(dayKey = getParisDayKey()): DailyChallenge {
    const idx = hashToIndex(dayKey, DAILY_POOL.length);
    const base = DAILY_POOL[idx];
    return { dayKey, ...base };
}

export function dailyTitle(lang: Lang): string {
    return lang === 'fr' ? 'Défi du jour' : 'Daily challenge';
}
