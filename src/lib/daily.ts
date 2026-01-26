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
// IMPORTANT: daily challenge selection is date-hashed into these arrays.
// If you change the order/contents of a pool, you change historical day mappings.
// So we version pools and cut over on a specific date.

// v1 pool: historical (pre cutover)
const DAILY_POOL_V1: Array<Omit<DailyChallenge, 'dayKey'>> = [
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

// Cutover: today (Europe/Paris)
// After this dayKey (inclusive), use v2 pools.
const DAILY_POOL_V2_START_DAY = '2026-01-26';

// v2 pools (mode-specific)
// - Coach can include constraints that are only checkable at submit (pangram)
// - Versus must remain enforceable during streaming for the Machine, so we avoid pangram (flex)

const DAILY_POOL_V2_COACH: Array<Omit<DailyChallenge, 'dayKey'>> = [
    // Lipograms (more variety)
    { constraintId: 'lipogram', param: 'e' },
    { constraintId: 'lipogram', param: 'a' },
    { constraintId: 'lipogram', param: 'i' },
    { constraintId: 'lipogram', param: 'o' },
    { constraintId: 'lipogram', param: 'u' },
    { constraintId: 'lipogram', param: 's' },
    { constraintId: 'lipogram', param: 't' },
    { constraintId: 'lipogram', param: 'n' },

    // Monovocalisms
    { constraintId: 'monovocalism', param: 'a' },
    { constraintId: 'monovocalism', param: 'e' },
    { constraintId: 'monovocalism', param: 'i' },
    { constraintId: 'monovocalism', param: 'o' },
    { constraintId: 'monovocalism', param: 'u' },

    // Word-start constraints
    { constraintId: 'tautogram', param: 'm' },
    { constraintId: 'tautogram', param: 's' },
    { constraintId: 'tautogram', param: 'c' },
    { constraintId: 'alliteration', param: 's' },
    { constraintId: 'alliteration', param: 'd' },
    { constraintId: 'alliteration', param: 'p' },
    { constraintId: 'alliteration', param: 't' },

    // Structure constraints
    { constraintId: 'snowball', param: '' },
    { constraintId: 'palindrome', param: '' },

    // Pangrams
    { constraintId: 'pangram', param: '' },
    { constraintId: 'pangram-strict', param: '' },

    // Beau présent — include famous phrases/sentences
    { constraintId: 'beau-present', param: 'GEORGES PEREC' },
    { constraintId: 'beau-present', param: 'La contrainte libère' },
    { constraintId: 'beau-present', param: "Anton Voyl n’arrivait pas à dormir" },
    { constraintId: 'beau-present', param: 'Je me souviens' },
    { constraintId: 'beau-present', param: 'OULIPO' },
];

const DAILY_POOL_V2_VERSUS: Array<Omit<DailyChallenge, 'dayKey'>> = [
    // Lipograms
    { constraintId: 'lipogram', param: 'e' },
    { constraintId: 'lipogram', param: 'a' },
    { constraintId: 'lipogram', param: 'i' },
    { constraintId: 'lipogram', param: 'o' },
    { constraintId: 'lipogram', param: 'u' },
    { constraintId: 'lipogram', param: 's' },

    // Monovocalisms
    { constraintId: 'monovocalism', param: 'a' },
    { constraintId: 'monovocalism', param: 'e' },
    { constraintId: 'monovocalism', param: 'i' },
    { constraintId: 'monovocalism', param: 'o' },
    { constraintId: 'monovocalism', param: 'u' },

    // Word-start constraints
    { constraintId: 'tautogram', param: 'm' },
    { constraintId: 'tautogram', param: 's' },
    { constraintId: 'tautogram', param: 'c' },
    { constraintId: 'alliteration', param: 's' },
    { constraintId: 'alliteration', param: 'd' },
    { constraintId: 'alliteration', param: 'p' },
    { constraintId: 'alliteration', param: 't' },

    // Structure constraints
    { constraintId: 'snowball', param: '' },
    { constraintId: 'palindrome', param: '' },

    // Strict pangram is enforceable mid-stream (no repeats), and fully checked on submit.
    { constraintId: 'pangram-strict', param: '' },

    // Beau présent
    { constraintId: 'beau-present', param: 'GEORGES PEREC' },
    { constraintId: 'beau-present', param: 'La contrainte libère' },
    { constraintId: 'beau-present', param: "Anton Voyl n’arrivait pas à dormir" },
    { constraintId: 'beau-present', param: 'Je me souviens' },
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

function hashToInt(input: string): number {
    // Deterministic 32-bit hash.
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    // Force uint32
    return h >>> 0;
}

function stableShuffle<T>(items: readonly T[], seed: string, key: (x: T) => string): T[] {
    // Deterministic “shuffle” by sorting on a seeded hash of the item key.
    // This guarantees a no-repeat cycle when iterating sequentially.
    return [...items]
        .map((x, i) => ({ x, i, h: hashToInt(`${seed}:${key(x)}`) }))
        .sort((a, b) => (a.h - b.h) || (a.i - b.i))
        .map((o) => o.x);
}

function dayKeyToUtcDate(dayKey: string): Date {
    const [y, m, d] = dayKey.split('-').map((x) => Number(x));
    return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

function diffDaysUtc(aDayKey: string, bDayKey: string): number {
    const a = dayKeyToUtcDate(aDayKey).getTime();
    const b = dayKeyToUtcDate(bDayKey).getTime();
    return Math.floor((a - b) / (24 * 60 * 60 * 1000));
}

// Precompute shuffled V2 pools so we get a stable, no-repeat rotation.
const DAILY_POOL_V2_COACH_SHUFFLED = stableShuffle(
    DAILY_POOL_V2_COACH,
    'daily-v2-coach',
    (x) => `${x.constraintId}:${x.param}`
);

const DAILY_POOL_V2_VERSUS_SHUFFLED = stableShuffle(
    DAILY_POOL_V2_VERSUS,
    'daily-v2-versus',
    (x) => `${x.constraintId}:${x.param}`
);

export function getDailyChallenge(dayKey = getParisDayKey()): DailyChallenge {
    return getDailyChallengeForMode({ dayKey, mode: 'coach' });
}

export function getDailyChallengeForMode(args: { dayKey?: string; mode: DailyMode }): DailyChallenge {
    const dayKey = args.dayKey ?? getParisDayKey();
    const mode = args.mode;

    // Use lexical comparison; dayKey is YYYY-MM-DD so it works.
    const useV2 = dayKey >= DAILY_POOL_V2_START_DAY;

    // V1: keep historical behavior (hash by dayKey).
    if (!useV2) {
        const idx = hashToIndex(dayKey, DAILY_POOL_V1.length);
        const base = DAILY_POOL_V1[idx];
        return { dayKey, ...base };
    }

    // V2: no-repeat rotation.
    // We iterate through a deterministically shuffled pool using (dayKey - startDay) as an offset.
    // This guarantees that the same constraint/param will not repeat until the full pool cycles.
    const pool = mode === 'versus' ? DAILY_POOL_V2_VERSUS_SHUFFLED : DAILY_POOL_V2_COACH_SHUFFLED;
    const offset = Math.max(0, diffDaysUtc(dayKey, DAILY_POOL_V2_START_DAY));
    const idx = offset % pool.length;
    const base = pool[idx];
    return { dayKey, ...base };
}

export function dailyTitle(lang: Lang): string {
    return lang === 'fr' ? 'Défi du jour' : 'Daily challenge';
}
