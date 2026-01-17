import { z } from 'zod';
import { db } from '@/server/db/client';
import { runs } from '@/server/db/schema';
import { getLevel, computeTotalScore, scoreTimedPalindrome, levelConstraint } from '@/lib/campaign';
import { isValidNickname, normalizeNickname } from '@/lib/nickname';

export const runtime = 'nodejs';

const BodySchema = z.object({
    campaignId: z.literal('v1'),
    lang: z.enum(['fr', 'en']),
    mode: z.enum(['arena', 'versus']),
    nickname: z.string(),

    // client-provided progress
    levelsCleared: z.number().int().min(0).max(10),
    levelIndex: z.number().int().min(1).max(10),
    text: z.string().max(50_000),
    elapsedMs: z.number().int().min(0).max(60 * 60 * 1000).optional(),
});

export async function POST(req: Request) {
    if (!process.env.DATABASE_URL) {
        return new Response('Missing DATABASE_URL', { status: 500 });
    }

    let json: unknown;
    try {
        json = await req.json();
    } catch {
        return new Response('Invalid JSON', { status: 400 });
    }

    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
        return new Response(parsed.error.message, { status: 400 });
    }

    const body = parsed.data;
    const nickname = normalizeNickname(body.nickname);
    if (!isValidNickname(nickname)) {
        return new Response('Invalid nickname (use 3-10 chars: A-Z0-9_-)', { status: 400 });
    }

    const level = getLevel(body.levelIndex);
    const { constraint, param } = levelConstraint(level);

    // Server-side validation: ensure the submitted text satisfies the constraint.
    const res = constraint.validate(body.text, param);
    if (!res.isValid) {
        return new Response(`Invalid run: ${res.error ?? 'constraint violation'}`, { status: 400 });
    }

    let levelScore = 0;
    if (level.metric === 'chars') {
        levelScore = body.text.length;
        const min = level.minChars ?? 0;
        if (levelScore < min) {
            return new Response(`Level not cleared: needs ${min} chars`, { status: 400 });
        }
    } else {
        const elapsed = body.elapsedMs ?? 0;
        levelScore = scoreTimedPalindrome(elapsed);
        // For palindrome levels, we just require validity.
    }

    const totalChars = body.text.length; // v1: store last-level chars; can evolve to total across levels
    const totalScore = computeTotalScore({
        levelsCleared: body.levelsCleared,
        levelScore,
    });

    try {
        const inserted = await db
            .insert(runs)
            .values({
                campaignId: body.campaignId,
                lang: body.lang,
                mode: body.mode,
                nickname,
                levelIndex: body.levelIndex,
                levelsCleared: body.levelsCleared,
                levelScore,
                totalScore,
                totalChars,
            })
            .returning({
                id: runs.id,
                createdAt: runs.createdAt,
                nickname: runs.nickname,
                totalScore: runs.totalScore,
                levelsCleared: runs.levelsCleared,
                levelIndex: runs.levelIndex,
                levelScore: runs.levelScore,
            });

        return Response.json({ ok: true, run: inserted[0] });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'DB insert failed';
        return new Response(msg, { status: 500 });
    }
}
