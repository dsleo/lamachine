"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { t } from '@/lib/i18n';
import { getCampaign, getLevel, formatLevelGoal, levelConstraint, scoreTimedPalindrome } from '@/lib/campaign';
import { countLetters } from '@/lib/text-metrics';
import { ConstrainedTextarea } from '@/components/constrained-textarea';
import { ArenaRunner } from '@/components/arena-runner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SubmitScoreDialog } from '@/components/submit-score-dialog';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function CampaignVersus() {
    const { settings, update } = useSettings();
    const lang = settings.lang;
    const s = t(lang);
    const { toast } = useToast();

    const [levelIndex, setLevelIndex] = useState(1);
    const [levelsCleared, setLevelsCleared] = useState(0);
    const [text, setText] = useState('');
    const [machineText, setMachineText] = useState('');
    const [isCleared, setIsCleared] = useState(false);
    const [startedAtMs, setStartedAtMs] = useState<number>(0);
    const [nowMs, setNowMs] = useState<number>(0);
    const [clearTimeMs, setClearTimeMs] = useState<number | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const level = useMemo(() => getLevel(levelIndex), [levelIndex]);
    const { constraint, param } = useMemo(() => levelConstraint(level), [level]);
    const goalText = useMemo(() => formatLevelGoal(level, lang), [level, lang]);

    const isLast = levelIndex === getCampaign().levels.length;

    // Auto-run the machine except for palindrome.
    const machineEnabled = level.metric !== 'timeMs';

    useEffect(() => {
        // reset per level
        setText('');
        setMachineText('');
        setIsCleared(false);
        setError(null);
        const now = Date.now();
        setStartedAtMs(now);
        setNowMs(now);
        setClearTimeMs(undefined);
    }, [levelIndex]);

    // Tick only for timed levels.
    useEffect(() => {
        if (level.metric !== 'timeMs') return;
        if (isCleared) return;
        const id = window.setInterval(() => setNowMs(Date.now()), 200);
        return () => window.clearInterval(id);
    }, [level.metric, isCleared]);

    const currentLevelScore = useMemo(() => {
        if (level.metric === 'chars') return countLetters(text);
        const elapsed = (clearTimeMs ?? nowMs) - startedAtMs;
        return scoreTimedPalindrome(elapsed);
    }, [level.metric, text, clearTimeMs, startedAtMs, nowMs]);

    const checkClear = (candidateText: string) => {
        if (level.metric === 'chars') {
            const min = level.minChars ?? 0;
            const humanOk = countLetters(candidateText) >= min;
            const beatsMachine = countLetters(candidateText) > countLetters(machineText);
            if (humanOk && beatsMachine) {
                setIsCleared(true);
                setLevelsCleared((prev) => Math.max(prev, levelIndex));
            }
        }
    };

    const onTextChange = (next: string) => {
        setText(next);
        if (!isCleared) checkClear(next);
    };

    const submitPalindrome = () => {
        const res = constraint.validate(text, param);
        if (!res.isValid) {
            setError(res.error ?? 'Invalid palindrome');
            return;
        }
        const elapsed = nowMs - startedAtMs;
        setClearTimeMs(elapsed);
        setIsCleared(true);
        setLevelsCleared((prev) => Math.max(prev, levelIndex));
    };

    const nextLevel = () => {
        const campaign = getCampaign();
        if (levelIndex >= campaign.levels.length) return;
        setLevelIndex((x) => x + 1);
    };

    // Auto-advance to next level (campaign flow) when cleared.
    useEffect(() => {
        if (!isCleared) return;
        if (isLast) return;
        const id = window.setTimeout(() => nextLevel(), 650);
        return () => window.clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCleared, isLast]);

    const finishAndSubmit = async (nickname: string) => {
        setSubmitting(true);
        setError(null);
        try {
            const elapsedMs = level.metric === 'timeMs' ? (clearTimeMs ?? Date.now() - startedAtMs) : undefined;
            const res = await fetch('/api/leaderboard/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaignId: 'v1',
                    lang,
                    mode: 'versus',
                    difficulty: settings.versusDifficulty,
                    nickname,
                    levelsCleared,
                    levelIndex,
                    text,
                    elapsedMs,
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

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <div className="text-xs text-muted-foreground">
                            {lang === 'fr' ? 'Difficulté' : 'Difficulty'}
                        </div>
                        <Select
                            value={settings.versusDifficulty}
                            onValueChange={(v) => update({ versusDifficulty: (v === 'hard' ? 'hard' : 'easy') as 'easy' | 'hard' })}
                        >
                            <SelectTrigger className="h-9 w-[160px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="easy">{lang === 'fr' ? 'Facile' : 'Easy'}</SelectItem>
                                <SelectItem value="hard">{lang === 'fr' ? 'Difficile (x1.5 score)' : 'Hard (x1.5 score)'}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-base">{s.versus.human}</CardTitle>
                            <div className="text-xs text-muted-foreground">{countLetters(text)} {s.common.chars}</div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <ConstrainedTextarea
                            constraint={constraint}
                            param={param}
                            value={text}
                            onChange={onTextChange}
                            placeholder={lang === 'fr' ? 'À vous…' : 'Your turn…'}
                            rows={12}
                            blockInvalidEdits={level.metric !== 'timeMs'}
                            showError
                        />

                        {level.metric === 'timeMs' && (
                            <Button size="sm" onClick={submitPalindrome} disabled={isCleared}>
                                {lang === 'fr' ? 'Soumettre le palindrome' : 'Submit palindrome'}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-base">{s.versus.machine}</CardTitle>
                            <div className="text-xs text-muted-foreground">{countLetters(machineText)} {s.common.chars}</div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {machineEnabled ? (
                            <ArenaRunner
                                lang={lang}
                                constraint={constraint}
                                param={param}
                                difficulty={settings.versusDifficulty}
                                steeringEnabled={false}
                                chrome={false}
                                headerEnabled={false}
                                statusEnabled={false}
                                onTextChange={(t) => {
                                    setMachineText(t);
                                    if (!isCleared) {
                                        // Re-evaluate when machine grows
                                        checkClear(text);
                                    }
                                }}
                                autoRun
                                controlsEnabled={false}
                            />
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                {lang === 'fr' ? 'Niveau palindrome : pas de Machine.' : 'Palindrome level: no Machine.'}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {isLast && (
                <div className="flex items-center justify-end gap-2">
                    <SubmitScoreDialog
                        lang={lang}
                        triggerLabel={lang === 'fr' ? 'Envoyer score' : 'Submit score'}
                        disabled={submitting || !isCleared}
                        onSubmit={finishAndSubmit}
                    />
                </div>
            )}

            {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
    );
}
