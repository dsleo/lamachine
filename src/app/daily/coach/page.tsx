"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/hooks/use-settings';
import { getDailyChallenge, getParisDayKey } from '@/lib/daily';
import { getConstraintById, type ConstraintId } from '@/lib/constraints';
import { formatDayKeyDisplay } from '@/lib/time';
import { ArenaRunner } from '@/components/arena-runner';
import { Card, CardContent } from '@/components/ui/card';
import { SubmitScoreDialog } from '@/components/submit-score-dialog';
import { useToast } from '@/hooks/use-toast';

export default function DailyCoachPage() {
    const router = useRouter();
    const { settings } = useSettings();
    const lang = settings.lang;
    const { toast } = useToast();

    const dayKey = useMemo(() => getParisDayKey(), []);
    const challenge = useMemo(() => getDailyChallenge(dayKey), [dayKey]);
    const constraint = useMemo(() => getConstraintById(challenge.constraintId), [challenge.constraintId]);

    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async (nickname: string) => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/daily/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dayKey,
                    lang,
                    mode: 'coach',
                    nickname,
                    text,
                }),
            });

            const raw = await res.text().catch(() => '');
            const json = (() => {
                try {
                    return raw ? (JSON.parse(raw) as { approved?: boolean; reason?: string }) : null;
                } catch {
                    return null;
                }
            })();

            if (!res.ok) {
                throw new Error(json?.reason || raw || 'Submit failed');
            }

            if (json?.approved) {
                toast({ title: lang === 'fr' ? '✅ Accepté' : '✅ Accepted', description: json.reason });
                router.push(
                    `/leaderboard?celebrate=1&mode=coach&dayKey=${encodeURIComponent(dayKey)}&chars=${text.length}&constraintId=${encodeURIComponent(challenge.constraintId satisfies ConstraintId)}&param=${encodeURIComponent(challenge.param ?? '')}`
                );
            } else {
                toast({ title: lang === 'fr' ? '❌ Refusé' : '❌ Rejected', description: json?.reason ?? '' });
            }
        } catch (e) {
            toast({
                title: lang === 'fr' ? 'Erreur' : 'Error',
                description: e instanceof Error ? e.message : 'Submit failed',
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen w-full bg-background">
            <div className="mx-auto w-full max-w-5xl space-y-6 p-6 sm:p-10">
                <header className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">
                        {lang === 'fr' ? 'Coachez la Machine' : 'Coach the Machine'}
                    </h1>
                </header>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <div className="text-2xl font-semibold">
                                    {constraint.name}
                                    {challenge.param ? ` en ${challenge.param}` : ''}
                                </div>
                                <div className="text-sm text-muted-foreground">{constraint.description}</div>
                            </div>
                            <div className="text-xs text-muted-foreground tabular-nums">{formatDayKeyDisplay(dayKey)}</div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6 space-y-2 text-sm">
                        {lang === 'fr' ? (
                            <>
                                <div className="font-medium">Comment jouer</div>
                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                    <li>Écrivez une consigne dans la zone “Consignes pour la Machine” (thème, ton, personnage…).</li>
                                    <li>Cliquez sur “Lancer”. La Machine écrit automatiquement.</li>
                                    <li>Quand ça vous plaît, cliquez “Valider & envoyer”.</li>
                                    <li>Le texte est accepté seulement s’il respecte la contrainte et “fait sens”.</li>
                                </ol>
                            </>
                        ) : (
                            <>
                                <div className="font-medium">How to play</div>
                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                    <li>Write a short instruction in the “Prompt steering” box (theme, tone, character…).</li>
                                    <li>Click “Run”. The Machine writes automatically.</li>
                                    <li>When you like it, click “Validate & submit”.</li>
                                    <li>Accepted only if it follows the constraint and actually makes sense.</li>
                                </ol>
                            </>
                        )}
                    </CardContent>
                </Card>

                <ArenaRunner
                    lang={lang}
                    constraint={constraint}
                    param={challenge.param}
                    steeringEnabled
                    onTextChange={setText}
                    controlsPlacement="steering"
                />

                <div className="flex items-center justify-end">
                    <SubmitScoreDialog
                        lang={lang}
                        triggerLabel={lang === 'fr' ? 'Valider & envoyer' : 'Validate & submit'}
                        disabled={submitting || text.length === 0}
                        onSubmit={submit}
                    />
                </div>
            </div>
        </main>
    );
}
