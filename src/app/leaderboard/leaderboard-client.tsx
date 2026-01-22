"use client";

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { t } from '@/lib/i18n';
import { useSettings } from '@/hooks/use-settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getConstraintById } from '@/lib/constraints';
import { formatDayKeyDisplay } from '@/lib/time';
import { parseCelebrationQuery } from '@/lib/celebration';
import { CelebrationBanner } from '@/components/celebration-banner';
import { CelebrationConfetti } from '@/components/celebration-confetti';

const MODE = 'versus' as const;
const LIMIT = 100;

type Row = {
    id: string;
    dayKey: string;
    createdAt: string;
    // Returned by /api/daily/top
    chars: number;
    rawChars?: number;
    difficulty?: string;
    nickname: string;
    text: string;
    constraintId: string;
    param: string;
};

function previewText(text: string): string {
    // Keep it single-line; actual truncation (ellipsis) is handled by CSS `truncate`.
    return text.trim().replace(/\s+/g, ' ');
}

export function LeaderboardClient() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { settings } = useSettings();
    const lang = settings.lang;
    t(lang);

    const celebrationQuery = useMemo(() => parseCelebrationQuery(searchParams), [searchParams]);

    // One-shot guard so confetti doesn't re-run on re-renders.
    const [showCelebrate, setShowCelebrate] = useState(false);
    useEffect(() => {
        if (celebrationQuery.celebrate) setShowCelebrate(true);
    }, [celebrationQuery.celebrate]);

    const constraintLabel = useMemo(() => {
        // Celebration banner expects a human label. We already have it in the query.
        const id = celebrationQuery.constraintId;
        if (!id) return undefined;
        const p = celebrationQuery.param ?? '';
        return p ? `${id} ${p}` : id;
    }, [celebrationQuery.constraintId, celebrationQuery.param]);

    const [rows, setRows] = useState<Row[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [openRow, setOpenRow] = useState<Row | null>(null);

    const title = useMemo(() => (lang === 'fr' ? 'Classement' : 'Leaderboard'), [lang]);

    const openConstraintLabel = useMemo(() => {
        if (!openRow) return '';
        try {
            const c = getConstraintById(openRow.constraintId as never);
            if (!openRow.param) return c.name;
            // Keep simple FR connector for now; constraints names are currently FR.
            return `${c.name} ${lang === 'fr' ? 'en' : 'in'} ${openRow.param}`;
        } catch {
            return openRow.param ? `${openRow.constraintId} ${openRow.param}` : openRow.constraintId;
        }
    }, [lang, openRow]);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    `/api/daily/leaderboard/list?mode=${MODE}&lang=${lang}&limit=${LIMIT}`,
                    { cache: 'no-store' }
                );
                if (!res.ok) {
                    const txt = await res.text().catch(() => 'Request failed');
                    throw new Error(txt);
                }
                const json = (await res.json()) as { ok: boolean; rows: Row[] };
                if (!cancelled) setRows(json.rows);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Failed');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, [lang]);

    return (
        <main className="min-h-screen w-full bg-background">
            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
                <CelebrationConfetti run={showCelebrate} />

                {showCelebrate && (
                    <CelebrationBanner
                        lang={lang}
                        data={{
                            mode: celebrationQuery.mode,
                            dayKey: celebrationQuery.dayKey,
                            chars: celebrationQuery.chars,
                            constraintLabel,
                        }}
                        onClose={() => {
                            setShowCelebrate(false);
                            // Remove celebrate params from URL so refresh doesn't re-trigger.
                            router.replace(pathname);
                        }}
                    />
                )}

                <header className="space-y-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h1 className="text-3xl font-bold">{title}</h1>
                    </div>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Top {LIMIT}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
                        {error && <div className="text-sm text-destructive">{error}</div>}
                        {!loading && !error && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-muted-foreground">
                                            <th className="py-2 pr-3">#</th>
                                            <th className="py-2 pr-3">Nickname</th>
                                            <th className="py-2 pr-3">Score</th>
                                            <th className="py-2 pr-3">Text</th>
                                            <th className="py-2 pr-3">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((r, i) => (
                                            <tr key={r.id} className="border-t align-top">
                                                <td className="py-2 pr-3">{i + 1}</td>
                                                <td className="py-2 pr-3 font-medium">{r.nickname}</td>
                                                <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{r.chars}</td>
                                                <td className="py-2 pr-3">
                                                    <button
                                                        type="button"
                                                        className="block w-[520px] max-w-[520px] truncate text-left underline-offset-2 hover:underline"
                                                        onClick={() => setOpenRow(r)}
                                                    >
                                                        {previewText(r.text)}
                                                    </button>
                                                </td>
                                                <td className="py-2 pr-3 tabular-nums whitespace-nowrap">
                                                    {formatDayKeyDisplay(r.dayKey)}
                                                </td>
                                            </tr>
                                        ))}
                                        {rows.length === 0 && (
                                            <tr>
                                                <td className="py-3 text-muted-foreground" colSpan={5}>
                                                    {lang === 'fr'
                                                        ? 'Aucun score pour l’instant.'
                                                        : 'No scores yet.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={!!openRow} onOpenChange={(open) => (!open ? setOpenRow(null) : null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                {openRow ? `${openRow.nickname} — ${openRow.chars} ${lang === 'fr' ? 'caractères' : 'chars'}` : ''}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                {lang === 'fr' ? 'Texte complet' : 'Full text'}
                            </DialogDescription>
                        </DialogHeader>

                        {openRow && (
                            <div className="text-sm text-muted-foreground">
                                {lang === 'fr' ? 'Contrainte:' : 'Constraint:'} {openConstraintLabel}
                            </div>
                        )}

                        <div className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/30 p-4 font-mono text-sm">
                            {openRow?.text ?? ''}
                        </div>

                        <div className="text-xs text-muted-foreground tabular-nums">
                            {openRow ? formatDayKeyDisplay(openRow.dayKey) : ''}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </main>
    );
}
