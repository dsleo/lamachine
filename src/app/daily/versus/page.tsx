"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/hooks/use-settings';
import { t } from '@/lib/i18n';
import { getDailyChallenge, getParisDayKey } from '@/lib/daily';
import { getConstraintById, type ConstraintId } from '@/lib/constraints';
import { formatDayKeyDisplay } from '@/lib/time';
import { ConstrainedTextarea } from '@/components/constrained-textarea';
import { ArenaRunner } from '@/components/arena-runner';
import { Card, CardContent } from '@/components/ui/card';
import { SubmitScoreDialog } from '@/components/submit-score-dialog';
import { useToast } from '@/hooks/use-toast';

export default function DailyVersusPage() {
    const router = useRouter();
    const { settings } = useSettings();
    const lang = settings.lang;
    const s = t(lang);
    const { toast } = useToast();

    const dayKey = useMemo(() => getParisDayKey(), []);
    const challenge = useMemo(() => getDailyChallenge(dayKey), [dayKey]);
    const constraint = useMemo(() => getConstraintById(challenge.constraintId), [challenge.constraintId]);

    const [humanText, setHumanText] = useState('');
    const [machineText, setMachineText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [machineStarted, setMachineStarted] = useState(false);
    const [machineTargetChars, setMachineTargetChars] = useState<number>(0);

    const submit = async (nickname: string) => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/daily/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dayKey,
                    lang,
                    mode: 'versus',
                    nickname,
                    text: humanText,
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
                    `/leaderboard?celebrate=1&mode=versus&dayKey=${encodeURIComponent(dayKey)}&chars=${humanText.length}&constraintId=${encodeURIComponent(challenge.constraintId satisfies ConstraintId)}&param=${encodeURIComponent(challenge.param ?? '')}`
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

    const beatsMachine = humanText.length > machineText.length;

    return (
        <main className="min-h-screen w-full bg-background">
            <div className="mx-auto w-full max-w-6xl space-y-6 p-6 sm:p-10">
                <header className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">
                        {lang === 'fr' ? 'Battez la Machine' : 'Beat the Machine'}
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
                                    <li>Écrivez votre texte.</li>
                                    <li>Cliquez “Au tour de la Machine”.</li>
                                </ol>
                                <ol start={3} className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                    <li>Si votre texte respecte la contrainte et est plus long que celui de la Machine, vous avez gagné !</li>
                                </ol>
                            </>
                        ) : (
                            <>
                                <div className="font-medium">How to play</div>
                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                    <li>Write your text on the left.</li>
                                    <li>Click “Machine&apos;s turn”.</li>
                                </ol>
                                <div className="text-muted-foreground">
                                    If your text follows the constraint and is longer than the Machine’s, you win.
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Card>
                        <CardContent className="pt-6 space-y-3">
                            <div className="text-sm font-medium">{s.versus.human}</div>
                            <ConstrainedTextarea
                                constraint={constraint}
                                param={challenge.param}
                                value={humanText}
                                onChange={setHumanText}
                                rows={14}
                                placeholder={lang === 'fr' ? 'Écrivez…' : 'Write…'}
                                blockInvalidEdits
                                showError
                            />
                            <div className="text-xs text-muted-foreground">{humanText.length} {s.common.chars}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6 space-y-3">
                            <div className="text-sm font-medium">{s.versus.machine}</div>
                            {!machineStarted ? (
                                <div className="space-y-3">
                                    <button
                                        type="button"
                                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                        onClick={() => {
                                            setMachineStarted(true);
                                            setMachineTargetChars(humanText.length);
                                            setMachineText('');
                                        }}
                                        disabled={humanText.length === 0}
                                    >
                                        {lang === 'fr' ? 'Au tour de la Machine' : 'Machine\'s turn'}
                                    </button>
                                </div>
                            ) : (
                                <ArenaRunner
                                    lang={lang}
                                    constraint={constraint}
                                    param={challenge.param}
                                    steeringEnabled={false}
                                    chrome={false}
                                    headerEnabled={false}
                                    statusEnabled={false}
                                    onTextChange={setMachineText}
                                    autoRun
                                    controlsEnabled={false}
                                    minCharsToBeat={machineTargetChars}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="flex items-center justify-end">
                    <SubmitScoreDialog
                        lang={lang}
                        triggerLabel={lang === 'fr' ? 'Valider & envoyer' : 'Validate & submit'}
                        disabled={submitting || humanText.length === 0 || !machineStarted || !beatsMachine}
                        onSubmit={submit}
                    />
                </div>

                {/* Intentionally no extra warning copy here; submit button state is enough. */}
            </div>
        </main>
    );
}
