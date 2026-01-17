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
                'Tu es un juge de qualité de texte.',
                'Objectif: décider si le texte est globalement grammatical et compréhensible en français.',
                'Le texte peut être poétique, étrange ou stylisé, MAIS il doit rester lisible et cohérent.',
                'Refuse si le texte ressemble à: charabia, suite de mots aléatoires, incohérence totale, répétitions absurdes, tokens bizarres, ou phrases qui ne veulent rien dire.',
                'Accepte si on peut en extraire un sens global (même vague) et des phrases plausibles.',
                'N’évalue PAS la contrainte formelle: elle est vérifiée ailleurs.',
                'Réponds uniquement en JSON: {"approved": boolean, "reason": string}.',
                'La reason doit être courte (<= 140 chars).',
            ].join('\n')
            : [
                'You are a text quality judge.',
                'Goal: decide if the text is broadly grammatical and understandable in English.',
                'Text can be poetic or stylized, BUT it must remain readable and coherent.',
                'Reject if it looks like: gibberish, random words, total incoherence, absurd repetitions, weird tokens, or sentences that do not mean anything.',
                'Approve if there is a global meaning (even vague) and plausible sentences.',
                'Do NOT evaluate the formal constraint: it is verified elsewhere.',
                'Only reply in JSON: {"approved": boolean, "reason": string}.',
                'Reason must be short (<= 140 chars).',
            ].join('\n');

    return {
        system,
        input: text,
    };
}

export function tryParseSemanticJudgeJson(raw: string): SemanticJudgeResult | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Try direct JSON
    try {
        return JSON.parse(trimmed) as SemanticJudgeResult;
    } catch {
        // continue
    }

    // Try to extract first JSON object from noisy output.
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
        return JSON.parse(m[0]) as SemanticJudgeResult;
    } catch {
        return null;
    }
}
