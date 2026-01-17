"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Constraint } from '@/lib/constraints';
import type { Lang } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { pickQuip } from '@/lib/quips';
import { DEFAULT_MODEL } from '@/lib/models';
import { countWords } from '@/lib/text-metrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type RunnerStatus = 'ready' | 'running' | 'stopped' | 'failed';

const WORD_BASED_CONSTRAINTS = new Set<Constraint['id']>(['tautogram', 'alliteration', 'snowball']);

function endsWithBoundary(text: string) {
    // Treat apostrophes and hyphens as separators too (e.g. m'avertir, porte-monnaie)
    // Includes straight and curly apostrophes.
    return /[\s.,;:!?\-"'’]$/.test(text);
}

function buildSystemPrompt(args: {
    lang: Lang;
    constraint: Constraint;
    param: string;
    steering?: string;
    minCharsToBeat?: number;
}) {
    const { lang, constraint, param, steering, minCharsToBeat } = args;
    const constraintLine =
        constraint.parameter.kind === 'none'
            ? `Constraint: ${constraint.name} — ${constraint.description}`
            : `Constraint: ${constraint.name} — ${constraint.description}. Parameter: ${param}`;

    const langLine =
        lang === 'fr'
            ? 'Language: French. Write in French.'
            : 'Language: English. Write in English.';

    const steeringBlock = steering?.trim()
        ? `User steering (follow if compatible with the constraint):\n${steering.trim()}`
        : '';

    const versusGoalBlock =
        typeof minCharsToBeat === 'number' && Number.isFinite(minCharsToBeat) && minCharsToBeat > 0
            ? `Versus goal: produce a coherent text STRICTLY longer than ${Math.floor(minCharsToBeat)} characters.`
            : '';

    return [
        'You are La Machine: a writing model challenged to obey a formal Oulipo-like constraint.',
        'Your primary objective is to produce as much text as possible while NEVER violating the constraint.',
        'Text MUST make sense: it should be readable, grammatical, and globally coherent (poetic is OK, gibberish is NOT).',
        'If you are unsure, choose safer words. Prefer short sentences. Avoid risky letters/starts.',
        'Do not mention the rules or self-commentary. Only output the text itself (no Markdown).',
        langLine,
        constraintLine,
        steeringBlock,
        versusGoalBlock,
    ]
        .filter(Boolean)
        .join('\n\n');
}

export function ArenaRunner(props: {
    lang: Lang;
    constraint: Constraint;
    param: string;
    steeringEnabled?: boolean;
    onTextChange?: (text: string) => void;
    onStatusChange?: (status: RunnerStatus) => void;
    autoRun?: boolean;
    controlsEnabled?: boolean;
    controlsPlacement?: 'footer' | 'steering';
    chrome?: boolean;
    headerEnabled?: boolean;
    statusEnabled?: boolean;
    minCharsToBeat?: number;
}) {
    const {
        lang,
        constraint,
        param,
        steeringEnabled = true,
        onTextChange,
        onStatusChange,
        autoRun = false,
        controlsEnabled = true,
        controlsPlacement = 'footer',
        chrome = true,
        headerEnabled = true,
        statusEnabled = true,
        minCharsToBeat,
    } = props;
    const s = t(lang);

    const [status, setStatus] = useState<RunnerStatus>('ready');
    const [text, setText] = useState('');
    const [lastValidLength, setLastValidLength] = useState(0);
    const [steering, setSteering] = useState('');
    const [quip, setQuip] = useState<string>('');
    const [lastQuip, setLastQuip] = useState<string | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);

    const abortRef = useRef<AbortController | null>(null);
    const validateTimerRef = useRef<number | null>(null);
    const statusRef = useRef<RunnerStatus>('ready');

    useEffect(() => {
        statusRef.current = status;
        onStatusChange?.(status);
    }, [status, onStatusChange]);

    const requiresParam = constraint.parameter.kind !== 'none';
    const hasParam = !requiresParam || !!param;

    const stop = () => {
        abortRef.current?.abort();
        abortRef.current = null;
        if (statusRef.current === 'running') setStatus('stopped');
    };

    const reset = () => {
        stop();
        setText('');
        setLastValidLength(0);
        onTextChange?.('');
        setLastError(null);
        setStatus('ready');
        setQuip('');
    };

    // When constraint/param changes, stop any running stream.
    useEffect(() => {
        reset();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [constraint.id, param, lang]);

    // Auto-run when requested (campaign vs mode).
    useEffect(() => {
        if (!autoRun) return;
        if (!hasParam) return;
        // Avoid restarting while already running.
        if (statusRef.current === 'running') return;
        void run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoRun, hasParam]);

    useEffect(() => {
        return () => {
            stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const scheduleValidate = (currentText: string) => {
        if (validateTimerRef.current) {
            window.clearTimeout(validateTimerRef.current);
        }

        // Word-based constraints should only be checked after a complete word (space/punctuation)
        // to avoid false failures mid-token.
        if (WORD_BASED_CONSTRAINTS.has(constraint.id)) {
            if (!endsWithBoundary(currentText) && currentText.length > 0) return;
        }

        const delay = 50;

        validateTimerRef.current = window.setTimeout(() => {
            if (constraint.id === 'palindrome') return; // not meaningful while streaming
            if (!hasParam) return;

            const res = constraint.validate(currentText, param);

            if (res.isValid) {
                setLastValidLength(currentText.length);
                return;
            }

            const findLastValidPrefixLength = () => {
                // We assume monotonicity: once the constraint is broken at some point,
                // appending more text cannot "fix" the earlier violation.
                let lo = 0;
                let hi = currentText.length;

                const isValidAt = (n: number) => constraint.validate(currentText.slice(0, n), param).isValid;

                while (lo < hi) {
                    const mid = Math.ceil((lo + hi) / 2);
                    if (isValidAt(mid)) lo = mid;
                    else hi = mid - 1;
                }
                return lo;
            };

            {
                const lastOk = findLastValidPrefixLength();
                setLastValidLength(lastOk);
                const trimmed = currentText.slice(0, lastOk);
                setText(trimmed);
                onTextChange?.(trimmed);
                setLastError(res.error ?? 'Constraint violation');
                stop();
                setStatus('failed');
                const q = pickQuip(lang, lastQuip);
                setLastQuip(q);
                setQuip(q);
            }
        }, delay);
    };

    const chars = text.length;
    const words = useMemo(() => countWords(text), [text]);

    const run = async () => {
        if (!hasParam) return;

        reset();
        setStatus('running');

        const controller = new AbortController();
        abortRef.current = controller;

        const system = buildSystemPrompt({
            lang,
            constraint,
            param,
            steering: steeringEnabled ? steering : undefined,
            minCharsToBeat,
        });

        // Ask for a continuation-style output.
        const prompt =
            lang === 'fr'
                ? 'Écris un texte original qui respecte la contrainte. Commence immédiatement.'
                : 'Write an original text that respects the constraint. Start immediately.';

        let res: Response;
        try {
            res = await fetch('/api/openai/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    model: DEFAULT_MODEL,
                    system,
                    prompt,
                    temperature: 0.7,
                }),
            });
        } catch (e) {
            // Abort is normal.
            if (controller.signal.aborted) {
                if (statusRef.current === 'running') setStatus('stopped');
                return;
            }
            setStatus('stopped');
            setLastError(e instanceof Error ? e.message : 'Request failed');
            return;
        }

        if (!res.ok) {
            setStatus('stopped');
            setLastError(await res.text().catch(() => 'Request failed'));
            return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
            setStatus('stopped');
            setLastError('No response body');
            return;
        }

        const decoder = new TextDecoder();
        let acc = '';
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                acc += chunk;
                setText(acc);
                onTextChange?.(acc);
                scheduleValidate(acc);
            }
            if (statusRef.current === 'running') setStatus('stopped');
        } catch (e) {
            // Abort is normal.
            if (controller.signal.aborted) {
                if (statusRef.current === 'running') setStatus('stopped');
            } else {
                setStatus('stopped');
                setLastError(e instanceof Error ? e.message : 'Stream error');
            }
        }
    };

    const statusLabel =
        status === 'ready'
            ? s.arena.statusReady
            : status === 'running'
                ? s.arena.statusRunning
                : status === 'failed'
                    ? s.arena.statusFailed
                    : s.arena.statusStopped;

    const core = (
        <div className="space-y-3">
            {(headerEnabled || statusEnabled) && (
                <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">{headerEnabled ? s.common.output : ''}</div>
                    {statusEnabled && (
                        <div
                            className={cn(
                                'rounded-full border px-3 py-1 text-xs',
                                status === 'failed'
                                    ? 'border-destructive/40 text-destructive'
                                    : status === 'running'
                                        ? 'border-emerald-500/40 text-emerald-700'
                                        : 'border-muted text-muted-foreground'
                            )}
                        >
                            {statusLabel}
                        </div>
                    )}
                </div>
            )}

            <div className="rounded-md border bg-muted/30 p-3 font-mono text-sm whitespace-pre-wrap min-h-[180px]">
                {text || <span className="text-muted-foreground">...</span>}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="inline-flex items-center gap-2">
                    <Label className="text-xs">{s.common.distanceSurvived}:</Label>
                    <span>
                        {chars} {s.common.chars}
                    </span>
                    <span className="opacity-60">•</span>
                    <span>
                        {words} {s.common.words}
                    </span>
                </div>

                {controlsPlacement === 'footer' && (
                    <div className="flex items-center gap-2">
                        {controlsEnabled && (
                            <>
                                <Button size="sm" onClick={status === 'running' ? stop : run} disabled={!hasParam}>
                                    {status === 'running' ? s.common.stop : s.common.run}
                                </Button>
                                <Button size="sm" variant="outline" onClick={reset}>
                                    {s.common.reset}
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {status === 'failed' && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                    <div className="font-medium text-destructive">{lastError}</div>
                    {quip && <div className="mt-1 text-muted-foreground">{quip}</div>}
                </div>
            )}

            {status !== 'failed' && lastError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                    <div className="font-medium text-destructive">{lastError}</div>
                </div>
            )}
        </div>
    );

    if (!chrome) return core;

    return (
        <div className="space-y-4">
            {steeringEnabled && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{s.common.steering}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={steering}
                            onChange={(e) => setSteering(e.target.value)}
                            placeholder={s.common.steeringPlaceholder}
                            rows={3}
                        />

                        {controlsEnabled && controlsPlacement === 'steering' && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Button size="sm" onClick={status === 'running' ? stop : run} disabled={!hasParam}>
                                    {status === 'running' ? s.common.stop : s.common.run}
                                </Button>
                                <Button size="sm" variant="outline" onClick={reset}>
                                    {s.common.reset}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardContent className="pt-6">{core}</CardContent>
            </Card>
        </div>
    );
}

