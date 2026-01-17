"use client";

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Lang } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { useSettings } from '@/hooks/use-settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getConstraintById, type ConstraintId } from '@/lib/constraints';
import { parseCelebrationQuery } from '@/lib/celebration';
import { CelebrationBanner } from '@/components/celebration-banner';
import { CelebrationConfetti } from '@/components/celebration-confetti';

type Mode = 'coach' | 'versus';

type Row = {
    id: string;
    createdAt: string;
    nickname: string;
    chars: number;
    dayKey: string;
    text: string;
    constraintId: string;
    param: string;
};

function formatConstraintLabel(args: { constraintId: string; param: string }): string {
    try {
        const c = getConstraintById(args.constraintId as ConstraintId);
        return args.param ? `${c.name} en ${args.param}` : c.name;
    } catch {
        return args.param ? `${args.constraintId} ${args.param}` : args.constraintId;
    }
}

export function LeaderboardClient() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { settings, update } = useSettings();
    const lang = settings.lang;
    const s = t(lang);

    const celebrationQuery = useMemo(() => parseCelebrationQuery(searchParams), [searchParams]);

    // One-shot guard so confetti doesn't re-run on re-renders.
    const [showCelebrate, setShowCelebrate] = useState(false);
    useEffect(() => {
        if (celebrationQuery.celebrate) setShowCelebrate(true);
    }, [celebrationQuery.celebrate]);

    const constraintLabel = useMemo(() => {
        if (!celebrationQuery.constraintId) return undefined;
        try {
            const c = getConstraintById(celebrationQuery.constraintId as ConstraintId);
            const p = celebrationQuery.param ?? '';
            return p ? `${c.name} en ${p}` : c.name;
        } catch {
            const p = celebrationQuery.param ?? '';
            return p ? `${celebrationQuery.constraintId} ${p}` : celebrationQuery.constraintId;
        }
    }, [celebrationQuery.constraintId, celebrationQuery.param]);

    const [mode, setMode] = useState<Mode>('coach');
    const [rows, setRows] = useState<Row[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const title = useMemo(() => (lang === 'fr' ? 'Leaderboard' : 'Leaderboard'), [lang]);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    `/api/daily/leaderboard/list?mode=${mode}&lang=${lang}&limit=10`,
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
    }, [lang, mode]);

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
                    <h1 className="text-3xl font-bold">{title}</h1>
                </header>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{s.common.language}</span>
                            <Select value={lang} onValueChange={(v) => update({ lang: v as Lang })}>
                                <SelectTrigger className="h-9 w-[140px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fr">{s.common.french}</SelectItem>
                                    <SelectItem value="en">{s.common.english}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-full border bg-card p-1">
                        <Button
                            size="sm"
                            variant={mode === 'coach' ? 'default' : 'ghost'}
                            className="rounded-full"
                            onClick={() => setMode('coach')}
                        >
                            {lang === 'fr' ? 'Coach la Machine' : 'Coach'}
                        </Button>
                        <Button
                            size="sm"
                            variant={mode === 'versus' ? 'default' : 'ghost'}
                            className="rounded-full"
                            onClick={() => setMode('versus')}
                        >
                            {lang === 'fr' ? 'Battre la Machine' : 'Versus'}
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Top 10</CardTitle>
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
                                            <th className="py-2 pr-3">Nick</th>
                                            <th className="py-2 pr-3">Chars</th>
                                            <th className="py-2 pr-3">Texte</th>
                                            <th className="py-2 pr-3">Day</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((r, i) => (
                                            <tr key={r.id} className="border-t">
                                                <td className="py-2 pr-3">{i + 1}</td>
                                                <td className="py-2 pr-3 font-medium">{r.nickname}</td>
                                                <td className="py-2 pr-3">{r.chars}</td>
                                                <td className="py-2 pr-3">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button size="sm" variant="secondary">{lang === 'fr' ? 'Voir' : 'View'}</Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>
                                                                    {r.nickname} • {r.chars} {lang === 'fr' ? 'caractères' : 'chars'}
                                                                </DialogTitle>
                                                            </DialogHeader>

                                                            <div className="text-xs text-muted-foreground">
                                                                {formatConstraintLabel({ constraintId: r.constraintId, param: r.param })}
                                                                <span className="opacity-60"> • </span>
                                                                <span className="tabular-nums">{r.dayKey}</span>
                                                            </div>

                                                            <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                                                                {r.text}
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                </td>
                                                <td className="py-2 pr-3 tabular-nums">{r.dayKey}</td>
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
            </div>
        </main>
    );
}

