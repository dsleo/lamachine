"use client";

import { useMemo, useState } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { t } from '@/lib/i18n';
import { getDailyChallenge, getParisDayKey } from '@/lib/daily';
import { getConstraintById } from '@/lib/constraints';
import { ConstrainedTextarea } from '@/components/constrained-textarea';
import { ArenaRunner } from '@/components/arena-runner';
import { Card, CardContent } from '@/components/ui/card';
import { SubmitScoreDialog } from '@/components/submit-score-dialog';
import { useToast } from '@/hooks/use-toast';

export default function DailyVersusPage() {
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
                    return raw ? (JSON.parse(raw) as any) : null;
                } catch {
                    return null;
                }
            })();

            if (!res.ok) {
                throw new Error(json?.reason || raw || 'Submit failed');
            }

            if (json?.approved) {
                toast({ title: lang === 'fr' ? '✅ Accepté' : '✅ Accepted', description: json.reason });
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
            <div className="mx-auto w-full max-w-6xl space-y-6 p-6 sm:p-10">
                <header className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">
                        {lang === 'fr' ? 'Humain vs Machine' : 'Human vs Machine'}
                    </h1>
                </header>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <div className="text-2xl font-semibold">{constraint.name}</div>
                                {challenge.param && <div className="text-sm text-muted-foreground">{challenge.param}</div>}
                            </div>
                            <div className="text-xs text-muted-foreground tabular-nums">{dayKey}</div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6 space-y-2 text-sm">
                        {lang === 'fr' ? (
                            <>
                                <div className="font-medium">Comment jouer</div>
                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                    <li>Écrivez votre texte à gauche. L’app empêche les erreurs de contrainte.</li>
                                    <li>À droite, la Machine écrit sous la même contrainte.</li>
                                    <li>Quand votre texte est prêt, cliquez “Valider & envoyer”.</li>
                                    <li>Le texte est accepté seulement s’il respecte la contrainte et “fait sens”.</li>
                                </ol>
                            </>
                        ) : (
                            <>
                                <div className="font-medium">How to play</div>
                                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                                    <li>Write your text on the left. The app prevents constraint mistakes.</li>
                                    <li>On the right, the Machine writes under the same constraint.</li>
                                    <li>When your text is ready, click “Validate & submit”.</li>
                                    <li>Accepted only if it follows the constraint and actually makes sense.</li>
                                </ol>
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
                            />
                            <div className="text-xs text-muted-foreground">{machineText.length} {s.common.chars}</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex items-center justify-end">
                    <SubmitScoreDialog
                        lang={lang}
                        triggerLabel={lang === 'fr' ? 'Valider & envoyer' : 'Validate & submit'}
                        disabled={submitting || humanText.length === 0}
                        onSubmit={submit}
                    />
                </div>
            </div>
        </main>
    );
}
