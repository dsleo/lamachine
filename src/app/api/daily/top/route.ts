import { z } from 'zod';
import { db } from '@/server/db/client';
import { dailySubmissions } from '@/server/db/schema';
import { and, desc, eq } from 'drizzle-orm';

const QuerySchema = z.object({
    dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    lang: z.enum(['fr', 'en']),
    mode: z.enum(['coach', 'versus']),
    limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function GET(req: Request) {
    if (!process.env.DATABASE_URL) {
        return new Response('Missing DATABASE_URL', { status: 500 });
    }

    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
        dayKey: url.searchParams.get('dayKey') ?? '',
        lang: url.searchParams.get('lang') ?? '',
        mode: url.searchParams.get('mode') ?? '',
        limit: url.searchParams.get('limit') ?? '10',
    });
    if (!parsed.success) {
        return new Response(parsed.error.message, { status: 400 });
    }

    const q = parsed.data;

    const rows = await db
        .select({
            id: dailySubmissions.id,
            createdAt: dailySubmissions.createdAt,
            nickname: dailySubmissions.nickname,
            chars: dailySubmissions.chars,
            text: dailySubmissions.text,
            semanticReason: dailySubmissions.semanticReason,
        })
        .from(dailySubmissions)
        .where(
            and(
                eq(dailySubmissions.dayKey, q.dayKey),
                eq(dailySubmissions.lang, q.lang),
                eq(dailySubmissions.mode, q.mode),
                eq(dailySubmissions.semanticApproved, 1)
            )
        )
        .orderBy(desc(dailySubmissions.chars), desc(dailySubmissions.createdAt))
        .limit(q.limit);

    return Response.json({ ok: true, rows });
}

