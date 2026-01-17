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
                'Tu es un juge de qualité de texte, plutôt BIENVEILLANT.',
                'Objectif: décider si le texte est globalement grammatical et compréhensible en français.',
                'Accepte par défaut, même si le texte est poétique, répétitif, ou imparfait.',
                'Refuse UNIQUEMENT si: charabia, mots aléatoires, incohérence totale, ou tokens bizarres (ex: répétitions de fragments illisibles).',
                'N’évalue PAS la contrainte formelle: elle est vérifiée ailleurs.',
                'Réponds uniquement en JSON: {"approved": boolean, "reason": string}.',
                'La reason doit être courte (<= 140 chars).',
            ].join('\n')
            : [
                'You are a text quality judge, fairly LENIENT.',
                'Goal: decide if the text is broadly grammatical and understandable in English.',
                'Approve by default even if poetic/repetitive/imperfect.',
                'Reject ONLY if: gibberish, random words, total incoherence, or weird tokens.',
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
