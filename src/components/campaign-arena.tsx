"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { getCampaign, getLevel, formatLevelGoal, levelConstraint } from '@/lib/campaign';
import { ArenaRunner } from '@/components/arena-runner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { SubmitScoreDialog } from '@/components/submit-score-dialog';

export function CampaignArena() {
    const { settings } = useSettings();
    const lang = settings.lang;
    const { toast } = useToast();

    const [levelIndex, setLevelIndex] = useState(1);
    const [levelsCleared, setLevelsCleared] = useState(0);
    const [text, setText] = useState('');
    const [isCleared, setIsCleared] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const level = useMemo(() => getLevel(levelIndex), [levelIndex]);
    const { constraint, param } = useMemo(() => levelConstraint(level), [level]);
    const goalText = useMemo(() => formatLevelGoal(level, lang), [level, lang]);

    const isLast = levelIndex === getCampaign().levels.length;

    // Campaign coach: skip palindrome timed level.
    useEffect(() => {
        if (level.metric === 'timeMs') {
            setLevelIndex((x) => Math.min(x + 1, getCampaign().levels.length));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [level.metric]);

    useEffect(() => {
        // reset per level
        setText('');
        setIsCleared(false);
        setError(null);
    }, [levelIndex]);

    const nextLevel = () => {
        const campaign = getCampaign();
        if (levelIndex >= campaign.levels.length) return;
        setLevelIndex((x) => x + 1);
    };

    // Auto-advance in campaign.
    useEffect(() => {
        if (!isCleared) return;
        if (isLast) return;
        toast({ title: lang === 'fr' ? 'Bravo !' : 'Nice!' });
        const id = window.setTimeout(() => nextLevel(), 650);
        return () => window.clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCleared, isLast]);

    const finishAndSubmit = async (nickname: string) => {
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/leaderboard/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaignId: 'v1',
                    lang,
                    mode: 'arena',
                    nickname,
                    levelsCleared,
                    levelIndex,
                    text,
                }),
            });
            if (!res.ok) {
                const msg = await res.text().catch(() => 'Submit failed');
                toast({
                    title: lang === 'fr' ? 'Erreur' : 'Error',
                    description: msg,
                    variant: 'destructive',
                });
                throw new Error(msg);
            }

            toast({ title: lang === 'fr' ? 'Score envoyé ✅' : 'Score submitted ✅' });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Submit failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                            <div className="text-2xl font-semibold">{constraint.name}</div>
                            {param && <div className="text-sm text-muted-foreground">{param}</div>}
                            <div className="text-sm">{goalText}</div>
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                            L{levelIndex}/{getCampaign().levels.length}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{lang === 'fr' ? 'Machine' : 'Machine'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <ArenaRunner
                        lang={lang}
                        constraint={constraint}
                        param={param}
                        steeringEnabled
                        autoRun
                        controlsEnabled
                        onTextChange={(t) => {
                            setText(t);
                            if (!isCleared && level.metric === 'chars') {
                                const min = level.minChars ?? 0;
                                if (t.length >= min) {
                                    setIsCleared(true);
                                    setLevelsCleared((prev) => Math.max(prev, levelIndex));
                                }
                            }
                        }}
                        onStatusChange={(st) => {
                            if (st === 'failed') {
                                setError(lang === 'fr' ? 'Violation de contrainte.' : 'Constraint violation.');
                            }
                        }}
                    />

                    {error && <div className="text-sm text-destructive">{error}</div>}
                    {isCleared && (
                        <div className="text-sm text-emerald-700">{lang === 'fr' ? 'Niveau validé.' : 'Level cleared.'}</div>
                    )}
                </CardContent>
            </Card>

            {isLast && (
                <div className="flex items-center justify-end">
                    <SubmitScoreDialog
                        lang={lang}
                        triggerLabel={lang === 'fr' ? 'Envoyer score' : 'Submit score'}
                        disabled={submitting || !isCleared}
                        onSubmit={finishAndSubmit}
                    />
                </div>
            )}
        </div>
    );
}
