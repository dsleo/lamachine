import { z } from 'zod';
import { db } from '@/server/db/client';
import { runs } from '@/server/db/schema';
import { and, desc, eq, gte } from 'drizzle-orm';
import { startOfMonth, startOfWeek } from '@/lib/time';

export const runtime = 'nodejs';

const QuerySchema = z.object({
    campaignId: z.literal('v1').default('v1'),
    mode: z.enum(['arena', 'versus']),
    lang: z.enum(['fr', 'en']),
    period: z.enum(['all', 'week', 'month']).default('all'),
    limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(req: Request) {
    if (!process.env.DATABASE_URL) {
        return new Response('Missing DATABASE_URL', { status: 500 });
    }

    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
        campaignId: url.searchParams.get('campaignId') ?? 'v1',
        mode: url.searchParams.get('mode') ?? undefined,
        lang: url.searchParams.get('lang') ?? undefined,
        period: url.searchParams.get('period') ?? 'all',
        limit: url.searchParams.get('limit') ?? '25',
    });

    if (!parsed.success) {
        return new Response(parsed.error.message, { status: 400 });
    }

    const q = parsed.data;

    const now = new Date();
    const from =
        q.period === 'week' ? startOfWeek(now) : q.period === 'month' ? startOfMonth(now) : null;

    const where =
        from
            ? and(
                eq(runs.campaignId, q.campaignId),
                eq(runs.mode, q.mode),
                eq(runs.lang, q.lang),
                gte(runs.createdAt, from)
            )
            : and(eq(runs.campaignId, q.campaignId), eq(runs.mode, q.mode), eq(runs.lang, q.lang));

    const rows = await db
        .select({
            id: runs.id,
            createdAt: runs.createdAt,
            nickname: runs.nickname,
            totalScore: runs.totalScore,
            levelsCleared: runs.levelsCleared,
            levelIndex: runs.levelIndex,
            levelScore: runs.levelScore,
        })
        .from(runs)
        .where(where)
        .orderBy(desc(runs.totalScore), desc(runs.levelScore), desc(runs.createdAt))
        .limit(q.limit);

    return Response.json({ ok: true, rows });
}
