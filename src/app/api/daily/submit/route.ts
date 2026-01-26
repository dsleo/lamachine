import { z } from 'zod';
import OpenAI from 'openai';
import { db } from '@/server/db/client';
import { dailySubmissions } from '@/server/db/schema';
import { isValidNickname, normalizeNickname } from '@/lib/nickname';
import { getDailyChallengeForMode } from '@/lib/daily';
import { getConstraintById } from '@/lib/constraints';
import { buildSemanticJudgePrompt, type SemanticJudgeResult } from '@/lib/semantic-judge';
import { tryParseSemanticJudgeJson } from '@/lib/semantic-judge';
import { DEFAULT_MODEL } from '@/lib/models';
import { countLetters } from '@/lib/text-metrics';

export const runtime = 'nodejs';

function jsonError(message: string, status: number) {
    return Response.json({ ok: false, reason: message }, { status });
}

const BodySchema = z.object({
    dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    lang: z.enum(['fr', 'en']),
    mode: z.enum(['coach', 'versus']),
    difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
    nickname: z.string(),
    text: z.string().min(1).max(50_000),
});

export async function POST(req: Request) {
    if (!process.env.DATABASE_URL) {
        return jsonError('Missing DATABASE_URL', 500);
    }
    if (!process.env.OPENAI_API_KEY) {
        return jsonError('Missing OPENAI_API_KEY', 500);
    }

    let json: unknown;
    try {
        json = await req.json();
    } catch {
        return jsonError('Invalid JSON', 400);
    }

    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
        return jsonError(parsed.error.message, 400);
    }

    const body = parsed.data;
    const nickname = normalizeNickname(body.nickname);
    if (!isValidNickname(nickname)) {
        return jsonError('Invalid nickname (use 3-10 chars: A-Z0-9_-)', 400);
    }

    const challenge = getDailyChallengeForMode({ dayKey: body.dayKey, mode: body.mode });
    const constraint = getConstraintById(challenge.constraintId);

    const difficulty = body.mode === 'versus' ? (body.difficulty ?? 'easy') : 'easy';
    const multiplier = difficulty === 'hard' ? 2.0 : difficulty === 'normal' ? 1.5 : 1.0;

    // Deterministic validation
    // Some constraints (e.g. pangram) have stricter semantics at final submit.
    const res = constraint.validate(body.text, challenge.param, { stage: 'submit' });
    if (!res.isValid) {
        return jsonError(`Constraint violation: ${res.error ?? 'invalid'}`, 400);
    }
    // No minimum length gating: leaderboard is simply “longest approved text”.

    // Semantic validation (LLM)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { system, input } = buildSemanticJudgePrompt({ lang: body.lang, text: body.text });

    let judge: SemanticJudgeResult | null = null;
    try {
        const r = await openai.responses.create({
            model: DEFAULT_MODEL,
            input,
            temperature: 0,
            max_output_tokens: 120,
            instructions: system,
        });

        const out = r.output_text?.trim() ?? '';
        judge = tryParseSemanticJudgeJson(out);
    } catch (e) {
        return jsonError(e instanceof Error ? e.message : 'LLM validation failed', 500);
    }

    // Fail-open: if the judge output is malformed, accept to avoid frustrating users.
    if (!judge) {
        judge = { approved: true, reason: body.lang === 'fr' ? 'OK' : 'OK' };
    }

    const approved = !!judge?.approved;
    const reason = (judge?.reason ?? '').slice(0, 200) || (approved ? 'OK' : 'Rejected');

    if (!approved) {
        // Not stored (to avoid spam); client can retry.
        return Response.json({ ok: false, approved: false, reason }, { status: 200 });
    }

    try {
        const rawChars = countLetters(body.text);
        const inserted = await db
            .insert(dailySubmissions)
            .values({
                dayKey: body.dayKey,
                lang: body.lang,
                mode: body.mode,
                difficulty,
                constraintId: challenge.constraintId,
                param: challenge.param,
                nickname,
                text: body.text,
                chars: Math.floor(rawChars * multiplier),
                rawChars,
                semanticApproved: 1,
                semanticReason: reason,
            })
            .returning({
                id: dailySubmissions.id,
                createdAt: dailySubmissions.createdAt,
                nickname: dailySubmissions.nickname,
                chars: dailySubmissions.chars,
            });

        return Response.json({ ok: true, approved: true, reason, row: inserted[0] });
    } catch (e) {
        return jsonError(e instanceof Error ? e.message : 'DB insert failed', 500);
    }
}
