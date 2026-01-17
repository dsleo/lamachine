import { z } from 'zod';
import { db } from '@/server/db/client';
import { dailySubmissions } from '@/server/db/schema';
import { and, desc, eq } from 'drizzle-orm';

export const runtime = 'nodejs';

const QuerySchema = z.object({
    mode: z.enum(['coach', 'versus']),
    // Keep lang filter for now to avoid mixing leaderboards.
    lang: z.enum(['fr', 'en']),
    limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function GET(req: Request) {
    if (!process.env.DATABASE_URL) {
        return new Response('Missing DATABASE_URL', { status: 500 });
    }

    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
        mode: url.searchParams.get('mode') ?? undefined,
        lang: url.searchParams.get('lang') ?? undefined,
        limit: url.searchParams.get('limit') ?? '25',
    });

    if (!parsed.success) {
        return new Response(parsed.error.message, { status: 400 });
    }

    const q = parsed.data;

    const rows = await db
        .select({
            id: dailySubmissions.id,
            dayKey: dailySubmissions.dayKey,
            createdAt: dailySubmissions.createdAt,
            nickname: dailySubmissions.nickname,
            chars: dailySubmissions.chars,
            text: dailySubmissions.text,
            constraintId: dailySubmissions.constraintId,
            param: dailySubmissions.param,
        })
        .from(dailySubmissions)
        .where(
            and(
                eq(dailySubmissions.lang, q.lang),
                eq(dailySubmissions.mode, q.mode),
                eq(dailySubmissions.semanticApproved, 1)
            )
        )
        .orderBy(desc(dailySubmissions.chars), desc(dailySubmissions.createdAt))
        .limit(q.limit);

    return Response.json({ ok: true, rows });
}
