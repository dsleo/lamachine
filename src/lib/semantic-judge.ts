import type { Lang } from '@/lib/i18n';

export type SemanticJudgeResult = {
    approved: boolean;
    reason: string;
};

export function buildSemanticJudgePrompt(args: {
    lang: Lang;
    text: string;
}): { system: string; input: string } {
    const { lang, text } = args;
    const system =
        lang === 'fr'
            ? [
                'Tu es un juge STRICT de qualité de texte.',
                'Objectif: décider si un texte est globalement grammatical, cohérent, et sémantiquement compréhensible en français.',
                'Refuse si: charabia, mots aléatoires, incohérences fortes, texte sans sens, répétitions absurdes, tokens bizarres.',
                'N’évalue PAS la contrainte formelle: elle est vérifiée ailleurs.',
                'Réponds uniquement en JSON: {"approved": boolean, "reason": string}.',
                'La reason doit être courte (<= 140 chars).',
            ].join('\n')
            : [
                'You are a STRICT text quality judge.',
                'Goal: decide if a text is broadly grammatical, coherent, and semantically meaningful in English.',
                'Reject if: gibberish, random words, strong incoherence, nonsense, absurd repetition, weird tokens.',
                'Do NOT evaluate the formal constraint: it is verified elsewhere.',
                'Only reply in JSON: {"approved": boolean, "reason": string}.',
                'Reason must be short (<= 140 chars).',
            ].join('\n');

    return {
        system,
        input: text,
    };
}

