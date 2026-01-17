import type { Lang } from '@/lib/i18n';
import { getConstraintById, type ConstraintId } from '@/lib/constraints';

export type CampaignId = 'v1';

export type LevelMetric = 'chars' | 'timeMs';

export type LevelDefinition = {
    index: number; // 1-based
    title: { fr: string; en: string };
    constraintId: ConstraintId;
    param: string;
    metric: LevelMetric;
    // If metric=chars, minimum chars to clear the level.
    minChars?: number;
    // If metric=timeMs, maximum time allowed (optional). In practice we just score time.
    maxTimeMs?: number;
};

export type CampaignDefinition = {
    id: CampaignId;
    name: { fr: string; en: string };
    levels: readonly LevelDefinition[];
};

export const CAMPAIGN_V1: CampaignDefinition = {
    id: 'v1',
    name: { fr: 'Campagne V1', en: 'Campaign V1' },
    levels: [
        {
            index: 1,
            title: { fr: 'Lipogramme (sans « e »)', en: 'Lipogram (no “e”)' },
            constraintId: 'lipogram',
            param: 'e',
            metric: 'chars',
            minChars: 160,
        },
        {
            index: 2,
            title: { fr: 'Tautogramme (lettre « s »)', en: 'Tautogram (letter “s”)' },
            constraintId: 'tautogram',
            param: 's',
            metric: 'chars',
            minChars: 140,
        },
        {
            index: 3,
            title: { fr: 'Monovocalisme (seulement « e »)', en: 'Monovocalism (only “e”)' },
            constraintId: 'monovocalism',
            param: 'e',
            metric: 'chars',
            minChars: 140,
        },
        {
            index: 4,
            title: { fr: 'Allitération (consonne « t »)', en: 'Alliteration (consonant “t”)' },
            constraintId: 'alliteration',
            param: 't',
            metric: 'chars',
            minChars: 160,
        },
        {
            index: 5,
            title: { fr: 'Beau présent (GEORGES PEREC)', en: 'Beau présent (GEORGES PEREC)' },
            constraintId: 'beau-present',
            param: 'georges perec',
            metric: 'chars',
            minChars: 120,
        },
        {
            index: 6,
            title: { fr: 'Boule de neige', en: 'Snowball' },
            constraintId: 'snowball',
            param: '',
            metric: 'chars',
            minChars: 120,
        },
        {
            index: 7,
            title: { fr: 'Lipogramme (sans « a »)', en: 'Lipogram (no “a”)' },
            constraintId: 'lipogram',
            param: 'a',
            metric: 'chars',
            minChars: 180,
        },
        {
            index: 8,
            title: { fr: 'Beau présent (OULIPO)', en: 'Beau présent (OULIPO)' },
            constraintId: 'beau-present',
            param: 'oulipo',
            metric: 'chars',
            minChars: 80,
        },
        {
            index: 9,
            title: { fr: 'Palindrome (chrono)', en: 'Palindrome (timed)' },
            constraintId: 'palindrome',
            param: '',
            metric: 'timeMs',
            // purely time-based; we could add maxTimeMs later
        },
        {
            index: 10,
            title: { fr: 'Monovocalisme (seulement « a »)', en: 'Monovocalism (only “a”)' },
            constraintId: 'monovocalism',
            param: 'a',
            metric: 'chars',
            minChars: 220,
        },
    ],
};

export const getCampaign = () => CAMPAIGN_V1;

export function getLevel(levelIndex: number): LevelDefinition {
    const lvl = CAMPAIGN_V1.levels.find((l) => l.index === levelIndex);
    if (!lvl) throw new Error(`Unknown level ${levelIndex}`);
    return lvl;
}

export function computeTotalScore(args: {
    levelsCleared: number;
    levelScore: number;
}): number {
    // Dominant term so “levels matter most”.
    return args.levelsCleared * 1_000_000 + args.levelScore;
}

export function scoreTimedPalindrome(timeMs: number): number {
    // Faster is better, never negative.
    return Math.max(0, 600_000 - Math.max(0, Math.floor(timeMs)));
}

export function levelConstraint(level: LevelDefinition) {
    const constraint = getConstraintById(level.constraintId);
    return { constraint, param: level.param };
}

export function formatLevelGoal(level: LevelDefinition, lang: Lang): string {
    if (level.metric === 'chars') {
        const n = level.minChars ?? 0;
        return lang === 'fr' ? `Objectif : atteindre ${n} caractères (sans violation)` : `Goal: reach ${n} chars (no violation)`;
    }
    return lang === 'fr' ? 'Objectif : écrire un palindrome le plus vite possible' : 'Goal: write a palindrome as fast as possible';
}
