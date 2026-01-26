"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/hooks/use-settings';
import { t } from '@/lib/i18n';
import { getDailyChallengeForMode, getParisDayKey } from '@/lib/daily';
import { getConstraintById, type ConstraintId } from '@/lib/constraints';
import { formatDayKeyDisplay } from '@/lib/time';
import { ConstrainedTextarea } from '@/components/constrained-textarea';
import { ArenaRunner, type ArenaRunnerAttemptInfo, type ArenaRunnerStatus } from '@/components/arena-runner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubmitScoreDialog } from '@/components/submit-score-dialog';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { countLetters, countWords } from '@/lib/text-metrics';
import { LoadingDots } from '@/components/loading-dots';

const DIFFICILE_MODEL = process.env.NEXT_PUBLIC_MACHINE_DIFFICILE_MODEL;

export default function DailyVersusPage() {
    const router = useRouter();
    const { settings, update } = useSettings();
    const lang = settings.lang;
    const s = t(lang);
    const { toast } = useToast();

    const dayKey = useMemo(() => getParisDayKey(), []);
    const challenge = useMemo(() => getDailyChallengeForMode({ dayKey, mode: 'versus' }), [dayKey]);
    const constraint = useMemo(() => getConstraintById(challenge.constraintId), [challenge.constraintId]);

    const constraintSentence = useMemo(() => {
        if (lang !== 'fr') return null;

        const q = (s: string) => `“${s}”`;

        switch (challenge.constraintId) {
            case 'lipogram':
                return `Écrire un lipogramme sans la lettre ${q(challenge.param ?? '')}.`;
            case 'monovocalism':
                return `Écrire un texte avec une seule voyelle : ${q(challenge.param ?? '')}.`;
            case 'tautogram':
                return `Écrire un tautogramme en ${challenge.param ?? ''}`;
            case 'alliteration':
                return `Écrire une allitération en ${challenge.param ?? ''}`;
            case 'snowball':
                return 'Écrire une boule de neige';
            case 'beau-present':
                return `Écrire un beau présent avec les lettres de ${q(challenge.param ?? '')}.`;
            case 'palindrome':
                return 'Écrire un palindrome';
            case 'pangram':
                return 'Écrire un pangramme';
            case 'pangram-strict':
                return 'Écrire un pangramme strict (chaque lettre une seule fois)';
            default:
                // Fallback (should not happen) – keep UI usable.
                return `Écrire un ${constraint.name.toLowerCase()}`;
        }
    }, [challenge.constraintId, challenge.param, constraint.name, lang]);

    const [humanText, setHumanText] = useState('');
    const [machineText, setMachineText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [machineStarted, setMachineStarted] = useState(false);
    const [machineTarget, setMachineTarget] = useState<number>(0);
    const [machineRunKey, setMachineRunKey] = useState(0);
    const [machineStatus, setMachineStatus] = useState<ArenaRunnerStatus>('ready');
    const [machineAttemptInfo, setMachineAttemptInfo] = useState<ArenaRunnerAttemptInfo | null>(null);
    const [machineRunnerError, setMachineRunnerError] = useState<string | null>(null);
    const [machineViolation, setMachineViolation] = useState<{
        fullText: string;
        lastValidPrefix: string;
        error: string;
        highlightStart: number;
        highlightEnd: number;
    } | null>(null);

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
                    difficulty: settings.versusDifficulty,
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
                    `/leaderboard?celebrate=1&mode=versus&dayKey=${encodeURIComponent(dayKey)}&chars=${humanPoints}&constraintId=${encodeURIComponent(challenge.constraintId satisfies ConstraintId)}&param=${encodeURIComponent(challenge.param ?? '')}`
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

    const isSnowball = constraint.id === 'snowball';
    const isSnowballHard = isSnowball && settings.versusDifficulty === 'hard';

    const humanLetters = useMemo(() => countLetters(humanText), [humanText]);
    const humanPoints = useMemo(() => {
        const mult = settings.versusDifficulty === 'hard' ? 2.0 : settings.versusDifficulty === 'normal' ? 1.5 : 1.0;
        return Math.floor(humanLetters * mult);
    }, [humanLetters, settings.versusDifficulty]);
    const humanWords = useMemo(() => countWords(humanText), [humanText]);
    const rawMachineLetters = useMemo(() => countLetters(machineText), [machineText]);
    const rawMachineWords = useMemo(() => countWords(machineText), [machineText]);

    const machineViolationActive = !!(machineViolation && machineText === machineViolation.fullText);
    const machineHighlightStart = machineViolationActive ? machineViolation!.highlightStart : null;
    const machineHighlightEnd = machineViolationActive ? machineViolation!.highlightEnd : null;

    // Scoring uses ONLY the valid prefix if the machine violated.
    // For Snowball we compare WORD COUNT (not characters).
    const machineScore = isSnowball
        ? (machineViolationActive
            ? countWords(machineViolation!.lastValidPrefix)
            : rawMachineWords)
        : (machineViolationActive
            ? countLetters(machineViolation!.lastValidPrefix)
            : rawMachineLetters);

    // Display words for Snowball in general (not just hard), since it's the natural unit.
    const humanScore = isSnowball ? humanWords : humanLetters;
    const scoreUnitLabel = isSnowball ? s.common.words : s.common.chars;

    const beatsMachine = humanScore > machineScore;
    const machineDone = machineStarted && (machineStatus === 'failed' || machineStatus === 'stopped');
    const machineFailed = machineStarted && machineStatus === 'failed';
    const machineIsGenerating = machineStarted && !machineDone;

    // During hard-mode retries, ArenaRunner can temporarily reset the visible text
    // (e.g. restarting from an empty/short prefix). If we hide the score when it hits 0,
    // the header can visually flicker. Keep the last non-zero score while generating.
    const [machineDisplayedScore, setMachineDisplayedScore] = useState(0);

    useEffect(() => {
        if (!machineStarted) {
            setMachineDisplayedScore(0);
            return;
        }

        // When a (re)run starts, ArenaRunner can reset the text to empty.
        // Ensure we show a stable "0 <unit>" immediately to avoid any perceived flicker.
        if (machineText.length === 0) {
            setMachineDisplayedScore(0);
        }

        // When the run ends, always reflect the final score.
        if (machineDone) {
            setMachineDisplayedScore(machineScore);
            return;
        }

        // While generating, only update when we have a non-zero score.
        if (machineScore > 0) setMachineDisplayedScore(machineScore);
    }, [machineStarted, machineDone, machineScore, machineText.length]);

    const machineDisplayText = useMemo(() => {
        // If we violated, do not display any extra words after the violating token.
        if (machineHighlightEnd === null) return machineText;
        return machineText.slice(0, machineHighlightEnd);
    }, [machineText, machineHighlightEnd]);

    const difficultyLabel = useMemo(() => {
        const d = settings.versusDifficulty;
        if (lang === 'fr') {
            if (d === 'easy') return 'Facile';
            if (d === 'normal') return 'Normal';
            return 'Difficile';
        }
        if (d === 'easy') return 'Easy';
        if (d === 'normal') return 'Normal';
        return 'Hard';
    }, [lang, settings.versusDifficulty]);

    const difficultyIndex = settings.versusDifficulty === 'easy' ? 0 : settings.versusDifficulty === 'normal' ? 1 : 2;

    // Tooltip: keep it simple and adapt.
    // In Snowball hard mode, the machine can try up to 7 times per word.
    const machineDifficultyTooltip = (() => {
        // Snowball hard mode is word-by-word generation with retries per word.
        if (isSnowball && settings.versusDifficulty === 'hard') {
            return lang === 'fr'
                ? 'La Machine a droit à 7 tentatives par mot.'
                : 'The Machine gets up to 7 attempts per word.';
        }
        // Non-snowball: attempts are run-level retries.
        const attempts = settings.versusDifficulty === 'hard' ? 12 : settings.versusDifficulty === 'normal' ? 5 : 1;
        return lang === 'fr'
            ? `La Machine a droit à ${attempts} tentative${attempts > 1 ? 's' : ''}.`
            : `The Machine gets up to ${attempts} attempt${attempts > 1 ? 's' : ''}.`;
    })();

    // NOTE: We intentionally keep the single generation indicator visible
    // for the whole time the runner is active (including retries), and hide
    // it only once the machine reaches a terminal state (stopped/failed).

    return (
        <main className="min-h-screen w-full bg-background">
            <div className="mx-auto w-full max-w-6xl space-y-6 p-6 sm:p-10">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <div className="text-2xl font-semibold">{constraintSentence ?? constraint.name}</div>
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
                        <CardHeader className="p-4">
                            <div className="flex items-center justify-between gap-2">
                                <CardTitle className="text-base">{s.versus.human}</CardTitle>
                                {isSnowball
                                    ? (humanWords > 0 ? (
                                        <div className="text-xs text-muted-foreground">
                                            {humanWords} {s.common.words}
                                        </div>
                                    ) : null)
                                    : (humanLetters > 0 ? (
                                        <div className="text-xs text-muted-foreground">
                                            {humanLetters} {s.common.chars}
                                        </div>
                                    ) : null)}
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
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
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="p-4">
                            <div className="flex items-center justify-between gap-3">
                                <CardTitle className="text-base">{s.versus.machine}</CardTitle>

                                <div className="flex items-center gap-3">
                                    {machineIsGenerating && machineDisplayText.length === 0 && (
                                        <div className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                            {lang === 'fr' ? 'Génération' : 'Generating'}
                                            <LoadingDots />
                                        </div>
                                    )}

                                    <div className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                                        {machineStarted ? (
                                            <>
                                                {machineDisplayedScore} {scoreUnitLabel}
                                            </>
                                        ) : null}
                                    </div>

                                    <TooltipProvider>
                                        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                                            <span className="tabular-nums">{difficultyLabel}</span>
                                            <div className="w-[120px]">
                                                <Slider
                                                    value={[difficultyIndex]}
                                                    min={0}
                                                    max={2}
                                                    step={1}
                                                    onValueChange={(v) => {
                                                        const idx = v[0] ?? 0;
                                                        const next = idx <= 0 ? 'easy' : idx === 1 ? 'normal' : 'hard';
                                                        update({ versusDifficulty: next });
                                                    }}
                                                    aria-label={lang === 'fr' ? 'Difficulté (Machine)' : 'Difficulty (Machine)'}
                                                />
                                            </div>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] hover:bg-accent"
                                                        aria-label={lang === 'fr' ? 'Info difficulté' : 'Difficulty info'}
                                                    >
                                                        i
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-[260px] whitespace-normal">
                                                    {machineDifficultyTooltip}
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TooltipProvider>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-4 pt-0 space-y-3">
                            {!machineStarted ? (
                                <div className="relative">
                                    {/* Invisible textarea keeps perfect height alignment with the human textarea. */}
                                    <Textarea rows={14} readOnly value="" className="typewriter-textarea invisible" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <button
                                            type="button"
                                            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                            onClick={() => {
                                                setMachineStarted(true);
                                                // Surface the progress indicator immediately.
                                                setMachineStatus('running');
                                                setMachineTarget(humanScore);
                                                setMachineText('');
                                                setMachineDisplayedScore(0);
                                                setMachineAttemptInfo(null);
                                                setMachineRunnerError(null);
                                                setMachineViolation(null);
                                                setMachineRunKey((k) => k + 1);
                                            }}
                                            disabled={humanScore === 0}
                                        >
                                            {lang === 'fr' ? 'Au tour de la Machine' : "Machine's turn"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Render machine output with invalid tail highlighted (when present). */}
                                    <div className="relative">
                                        <Textarea rows={14} readOnly value={machineDisplayText} className="typewriter-textarea invisible" />
                                        <div
                                            className="absolute inset-0 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm font-mono whitespace-pre-wrap break-words overflow-auto"
                                            aria-label={lang === 'fr' ? 'Texte de la Machine' : 'Machine text'}
                                        >
                                            {machineHighlightStart === null || machineHighlightEnd === null ? (
                                                machineDisplayText
                                            ) : (
                                                <>
                                                    <span>{machineDisplayText.slice(0, machineHighlightStart)}</span>
                                                    <span className="text-destructive">
                                                        {machineDisplayText.slice(machineHighlightStart, machineHighlightEnd)}
                                                    </span>
                                                    <span>{machineDisplayText.slice(machineHighlightEnd)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Hidden runner (drives machineText updates) */}
                                    <ArenaRunner
                                        key={machineRunKey}
                                        lang={lang}
                                        constraint={constraint}
                                        param={challenge.param}
                                        difficulty={settings.versusDifficulty}
                                        modelOverride={settings.versusDifficulty === 'hard' && DIFFICILE_MODEL ? DIFFICILE_MODEL : undefined}
                                        hardRetryRollbackMode="sentence"
                                        steeringEnabled={false}
                                        chrome={false}
                                        headerEnabled={false}
                                        statusEnabled={false}
                                        onTextChange={setMachineText}
                                        onStatusChange={(st) => {
                                            setMachineStatus(st);
                                        }}
                                        onAttemptInfoChange={setMachineAttemptInfo}
                                        onLastErrorChange={setMachineRunnerError}
                                        onViolation={(v) => setMachineViolation(v)}
                                        autoRun
                                        controlsEnabled={false}
                                        minCharsToBeat={isSnowballHard ? undefined : machineTarget}
                                        minWordsToBeat={isSnowballHard ? machineTarget : undefined}
                                        renderOutput={false}
                                        truncateOnViolation={false}
                                    />

                                    {/* When the runner is hidden, failures can look like "nothing happened".
                                        Show a compact error message when the machine fails. */}
                                    {machineFailed && (machineRunnerError || machineViolation?.error) && (
                                        <div className="text-xs text-destructive">
                                            {machineRunnerError ?? machineViolation?.error}
                                        </div>
                                    )}

                                    {/* Retry CTA moved to the bottom action row */}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="flex items-center justify-end gap-2">
                    {machineDone && (
                        <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
                            onClick={() => {
                                // Let the user extend their text, then rerun the Machine against the new length.
                                setMachineTarget(humanScore);
                                setMachineText('');
                                setMachineDisplayedScore(0);
                                setMachineAttemptInfo(null);
                                setMachineRunnerError(null);
                                setMachineViolation(null);
                                setMachineStatus('running');
                                setMachineRunKey((k) => k + 1);
                            }}
                        >
                            {lang === 'fr' ? 'Réessayer' : 'Retry'}
                        </button>
                    )}
                    <SubmitScoreDialog
                        lang={lang}
                        triggerLabel={lang === 'fr' ? 'Valider & envoyer' : 'Validate & submit'}
                        disabled={submitting || humanScore === 0 || !machineStarted || !beatsMachine}
                        onSubmit={submit}
                    />
                </div>

                {/* Intentionally no extra warning copy here; submit button state is enough. */}
            </div>
        </main>
    );
}
