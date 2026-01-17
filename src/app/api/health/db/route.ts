import { pool } from '@/server/db/client';

export const runtime = 'nodejs';

// A tiny production-facing endpoint to confirm:
// - env var exists
// - DB connectivity works
// - required tables exist in public schema
//
// This intentionally does not expose the DATABASE_URL.
export async function GET() {
    if (!process.env.DATABASE_URL) {
        return Response.json({ ok: false, reason: 'Missing DATABASE_URL' }, { status: 500 });
    }

    try {
        // Connectivity check
        await pool.query('select 1 as ok');

        // Table presence check
        const r = await pool.query(
            `select table_name
             from information_schema.tables
             where table_schema = 'public'
             order by table_name;`
        );
        const tables: string[] = (r.rows ?? []).map((x: any) => String(x.table_name));

        const required = ['runs', 'daily_submissions'];
        const missing = required.filter((t) => !tables.includes(t));

        return Response.json({ ok: missing.length === 0, tables, missing });
    } catch (e) {
        return Response.json(
            {
                ok: false,
                reason: e instanceof Error ? e.message : 'DB health check failed',
            },
            { status: 500 }
        );
    }
}
