"use client";

import { useEffect, useMemo, useState } from 'react';
import type { Lang } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { useSettings } from '@/hooks/use-settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Period = 'all' | 'week' | 'month';
type Mode = 'arena' | 'versus';

type Row = {
    id: string;
    createdAt: string;
    nickname: string;
    totalScore: number;
    levelsCleared: number;
    levelIndex?: number;
    levelScore: number;
};

export default function LeaderboardPage() {
    const { settings, update } = useSettings();
    const lang = settings.lang;
    const s = t(lang);

    const [mode, setMode] = useState<Mode>('arena');
    const [period, setPeriod] = useState<Period>('all');
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
                    `/api/leaderboard/list?campaignId=v1&mode=${mode}&lang=${lang}&period=${period}&limit=25`,
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
    }, [lang, mode, period]);

    return (
        <main className="min-h-screen w-full bg-background">
            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
                <header className="space-y-2">
                    <h1 className="text-3xl font-bold">{title}</h1>
                    <p className="text-sm text-muted-foreground">
                        {lang === 'fr'
                            ? 'Classements anonymes type arcade (campagne).'
                            : 'Arcade-style anonymous rankings (campaign).'}
                    </p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Filtres</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <div className="text-xs text-muted-foreground">{s.common.language}</div>
                            <Select value={lang} onValueChange={(v) => update({ lang: v as Lang })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fr">{s.common.french}</SelectItem>
                                    <SelectItem value="en">{s.common.english}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs text-muted-foreground">Mode</div>
                            <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="arena">{s.nav.arena}</SelectItem>
                                    <SelectItem value="versus">{s.nav.versus}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs text-muted-foreground">Période</div>
                            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All-time</SelectItem>
                                    <SelectItem value="week">This week</SelectItem>
                                    <SelectItem value="month">This month</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Top 25</CardTitle>
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
                                            <th className="py-2 pr-3">Score</th>
                                            <th className="py-2 pr-3">Levels</th>
                                            <th className="py-2 pr-3">Level score</th>
                                            <th className="py-2 pr-3">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((r, i) => (
                                            <tr key={r.id} className="border-t">
                                                <td className="py-2 pr-3">{i + 1}</td>
                                                <td className="py-2 pr-3 font-medium">{r.nickname}</td>
                                                <td className="py-2 pr-3">{r.totalScore}</td>
                                                <td className="py-2 pr-3">{r.levelsCleared}{r.levelIndex ? ` (L${r.levelIndex})` : ''}</td>
                                                <td className="py-2 pr-3">{r.levelScore}</td>
                                                <td className="py-2 pr-3">{new Date(r.createdAt).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {rows.length === 0 && (
                                            <tr>
                                                <td className="py-3 text-muted-foreground" colSpan={6}>
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
