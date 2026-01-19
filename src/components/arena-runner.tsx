"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Constraint } from '@/lib/constraints';
import type { Lang } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { pickQuip } from '@/lib/quips';
import { DEFAULT_MODEL } from '@/lib/models';
import { countLetters, countWords } from '@/lib/text-metrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type RunnerStatus = 'ready' | 'running' | 'stopped' | 'failed';

export type ArenaRunnerAttemptInfo = { attempt: number; max: number; retrying: boolean };
export type ArenaRunnerStatus = RunnerStatus;

export type VersusDifficulty = 'easy' | 'hard';

export type HardRetryRollbackMode = 'word' | 'sentence';

const WORD_BASED_CONSTRAINTS = new Set<Constraint['id']>(['tautogram', 'alliteration', 'snowball']);

const BOUNDARY_CHAR_REGEX = /[\s.,;:!?\-"'’]/;

function findWordBounds(text: string, index: number): { start: number; end: number } {
    const n = text.length;
    if (n === 0) return { start: 0, end: 0 };
    const i = Math.min(Math.max(index, 0), n - 1);

    // If we're on a boundary, move right to the next non-boundary when possible.
    let pivot = i;
    while (pivot < n && BOUNDARY_CHAR_REGEX.test(text[pivot] ?? '')) pivot += 1;
    if (pivot >= n) {
        // No word to the right; move left.
        pivot = i;
        while (pivot > 0 && BOUNDARY_CHAR_REGEX.test(text[pivot] ?? '')) pivot -= 1;
    }

    let start = pivot;
    while (start > 0 && !BOUNDARY_CHAR_REGEX.test(text[start - 1] ?? '')) start -= 1;
    let end = pivot;
    while (end < n && !BOUNDARY_CHAR_REGEX.test(text[end] ?? '')) end += 1;
    return { start, end };
}

function rollbackBrokenWordAndEnsureSpace(prefix: string): string {
    // If the last valid prefix is inside a word (e.g. "Dan" from "Dans"),
    // rollback to the previous boundary so we don't keep a broken token.
    // Then ensure the prefix ends with a whitespace so the continuation appends cleanly.
    let cut: number | null = null;
    for (let i = prefix.length - 1; i >= 0; i -= 1) {
        if (BOUNDARY_CHAR_REGEX.test(prefix[i] ?? '')) {
            cut = i + 1;
            break;
        }
    }

    // No boundary found => the whole prefix is inside a single word (e.g. "Dan"),
    // so drop it entirely.
    if (cut === null) return '';

    const rolled = prefix.slice(0, cut);
    if (!rolled.trim()) return '';

    // If we end with an apostrophe, we should NOT add a space (e.g. "L'" + "air").
    if (/["'’]$/.test(rolled)) return rolled;

    // Ensure we have a whitespace boundary before appending.
    return /\s$/.test(rolled) ? rolled : `${rolled} `;
}

function removeLastWord(prefix: string): string {
    // Goal: remove the last *real* word from a prefix, keeping punctuation/spacing sane.
    // This is used only in hard-mode retries to avoid re-hitting the same violation.
    // The previous implementation was boundary-based and could incorrectly remove short
    // function words (e.g. "au"), producing outputs like "noir jardin".

    // 1) Trim trailing whitespace AND trailing punctuation.
    let end = prefix.length;
    while (end > 0 && /[\s.,;:!?\-"'’]/.test(prefix[end - 1] ?? '')) end -= 1;
    if (end <= 0) return '';

    // 2) Find the end of the last word (letters/digits only).
    let wordEnd = end;
    while (wordEnd > 0 && /[\p{L}\p{N}]/u.test(prefix[wordEnd - 1] ?? '')) wordEnd -= 1;
    const wordStart = wordEnd;
    const word = prefix.slice(wordStart, end);

    // If we didn't find a word, bail.
    if (!word) return '';

    // 3) Avoid removing very short words (prepositions/articles) which keeps grammar coherent.
    // If the last word is <= 2 chars, keep the prefix unchanged.
    if (word.length <= 2) {
        // Ensure we end with a clean boundary for appending.
        if (/["'’]$/.test(prefix)) return prefix;
        return /\s$/.test(prefix) ? prefix : `${prefix} `;
    }

    // 4) Cut before the word, then normalize the boundary.
    const head = prefix.slice(0, wordStart);
    if (!head.trim()) return '';
    if (/["'’]$/.test(head)) return head;
    return /\s$/.test(head) ? head : `${head} `;
}

function removeLastSentence(prefix: string): string {
    // Goal: remove the last sentence from a prefix, keeping punctuation/spacing sane.
    // Used in (some) hard-mode retries to make the model back up further than a single word.

    // 1) Trim trailing whitespace.
    let end = prefix.length;
    while (end > 0 && /\s/.test(prefix[end - 1] ?? '')) end -= 1;
    if (end <= 0) return '';

    // If we already end on a terminator, step left so we actually remove the last
    // non-empty sentence (and not just return the same prefix).
    while (end > 0 && (prefix[end - 1] === '!' || prefix[end - 1] === '?' || prefix[end - 1] === '.' || prefix[end - 1] === '…')) {
        end -= 1;
    }
    // Re-trim whitespace after removing terminators.
    while (end > 0 && /\s/.test(prefix[end - 1] ?? '')) end -= 1;
    if (end <= 0) return '';

    // 2) Find the last sentence terminator before `end`.
    // Treat newline as a terminator too.
    let cut: number | null = null;
    for (let i = end - 1; i >= 0; i -= 1) {
        const ch = prefix[i] ?? '';
        if (ch === '\n' || ch === '!' || ch === '?' || ch === '.' || ch === '…') {
            cut = i + 1;
            break;
        }
    }

    // No sentence boundary found => there's only one sentence; drop it entirely.
    if (cut === null) return '';

    const head = prefix.slice(0, cut);
    if (!head.trim()) return '';
    if (/\s$/.test(head)) return head;
    if (/["'’]$/.test(head)) return head;
    return `${head} `;
}

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
    difficulty?: VersusDifficulty;
}) {
    const { lang, constraint, param, steering, minCharsToBeat, difficulty } = args;
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
        // Coherence requirement is for the machine output quality.
        // (The semantic judge is applied to human submissions elsewhere.)
        'The text you generate MUST make sense: readable and coherent (poetic is OK; gibberish/random word soup is NOT).',
        'Fragments are allowed if they remain coherent and readable; avoid nonsense tokens.',
        'If you are unsure, choose safer words. Prefer short sentences. Avoid risky letters/starts.',
        'IMPORTANT: do not split words into letters separated by spaces (no "D a n"); write normal words.',
        'If you make a mistake and are asked to retry, you must keep the overall meaning/style coherent (continue the same text), while avoiding the exact mistake.',
        difficulty === 'hard'
            ? 'Hard mode: be extra conservative with word choice and structure. Prefer simple syntax and low-risk tokens.'
            : '',
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
    onAttemptInfoChange?: (info: ArenaRunnerAttemptInfo | null) => void;
    autoRun?: boolean;
    controlsEnabled?: boolean;
    controlsPlacement?: 'footer' | 'steering';
    chrome?: boolean;
    headerEnabled?: boolean;
    statusEnabled?: boolean;
    outputMinHeightClassName?: string;
    renderOutput?: boolean;
    truncateOnViolation?: boolean;
    hardRetryRollbackMode?: HardRetryRollbackMode;
    onViolation?: (info: {
        fullText: string;
        lastValidPrefix: string;
        error: string;
        highlightStart: number;
        highlightEnd: number;
    }) => void;
    minCharsToBeat?: number;
    difficulty?: VersusDifficulty;
}) {
    const {
        lang,
        constraint,
        param,
        steeringEnabled = true,
        onTextChange,
        onStatusChange,
        onAttemptInfoChange,
        autoRun = false,
        controlsEnabled = true,
        controlsPlacement = 'footer',
        chrome = true,
        headerEnabled = true,
        statusEnabled = true,
        outputMinHeightClassName = 'min-h-[180px]',
        renderOutput = true,
        truncateOnViolation = true,
        hardRetryRollbackMode = 'word',
        onViolation,
        minCharsToBeat,
        difficulty = 'easy',
    } = props;
    const s = t(lang);

    const [status, setStatus] = useState<RunnerStatus>('ready');
    const [text, setText] = useState('');
    const [steering, setSteering] = useState('');
    const [quip, setQuip] = useState<string>('');
    const [lastQuip, setLastQuip] = useState<string | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);
    const [attemptInfo, setAttemptInfo] = useState<ArenaRunnerAttemptInfo | null>(null);

    const abortRef = useRef<AbortController | null>(null);
    const statusRef = useRef<RunnerStatus>('ready');

    useEffect(() => {
        statusRef.current = status;
        onStatusChange?.(status);
    }, [status, onStatusChange]);

    useEffect(() => {
        onAttemptInfoChange?.(attemptInfo);
    }, [attemptInfo, onAttemptInfoChange]);

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
        onTextChange?.('');
        setLastError(null);
        setStatus('ready');
        setQuip('');
        setAttemptInfo(null);
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

    const chars = useMemo(() => countLetters(text), [text]);
    const words = useMemo(() => countWords(text), [text]);

    const run = async () => {
        if (!hasParam) return;

        const HARD_MAX_ATTEMPTS = 5;
        const HARD_RETRY_IF_FAILED_BEFORE_CHARS = 140;
        const isHard = difficulty === 'hard';
        const maxAttempts = isHard ? HARD_MAX_ATTEMPTS : 1;

        reset();
        setStatus('running');
        setAttemptInfo({ attempt: 1, max: maxAttempts, retrying: false });

        const systemBase = buildSystemPrompt({
            lang,
            constraint,
            param,
            steering: steeringEnabled ? steering : undefined,
            minCharsToBeat,
            difficulty,
        });

        const initialPrompt =
            lang === 'fr'
                ? 'Écris un texte original qui respecte la contrainte. Commence immédiatement.'
                : 'Write an original text that respects the constraint. Start immediately.';

        const buildRetryPrompt = (args: {
            fullText: string;
            lastValidPrefix: string;
            validatorError: string;
            attemptIndex: number; // 2..max
        }) => {
            const { fullText, lastValidPrefix, validatorError, attemptIndex } = args;
            const prefixLen = lastValidPrefix.length;
            const excerptBefore = lastValidPrefix.slice(Math.max(0, prefixLen - 120));
            const excerptAfter = fullText.slice(prefixLen, Math.min(fullText.length, prefixLen + 120));

            const restartingFromScratch = prefixLen === 0;

            if (lang === 'fr') {
                return [
                    `Tentative ${attemptIndex}/${maxAttempts}.`,
                    'Tu as produit ce texte:',
                    '"""',
                    fullText,
                    '"""',
                    '',
                    'Ce texte A ÉCHOUÉ car il a violé la contrainte.',
                    `Raison: ${validatorError}`,
                    restartingFromScratch
                        ? "Aucun préfixe valide (l’erreur est arrivée dès le début)."
                        : `La dernière portion valide se termine au caractère ${prefixLen}.`,
                    '',
                    'Contexte autour de l’erreur:',
                    '--- AVANT (valide) ---',
                    excerptBefore || '(vide)',
                    '--- APRÈS (invalide) ---',
                    excerptAfter || '(vide)',
                    '',
                    'Tâche:',
                    restartingFromScratch
                        ? '1) Recommence depuis ZÉRO (nouveau départ), sans reprendre le texte invalide.'
                        : '1) Repars EXACTEMENT du dernier préfixe valide (ne le répète pas).',
                    restartingFromScratch
                        ? '2) Écris un nouveau texte cohérent, et plus conservateur.'
                        : '2) Continue le MÊME texte (même sujet/ton/style) pour garder une cohérence globale.',
                    '3) Sois conservateur: phrases courtes, mots simples, faible risque.',
                    '4) Ne mentionne pas les règles, ni le fait que tu corriges.',
                    '5) Commence directement par un mot (pas d’espace initial).',
                    'Réponds UNIQUEMENT avec la continuation à ajouter.',
                ].join('\n');
            }

            return [
                `Attempt ${attemptIndex}/${maxAttempts}.`,
                'You produced this text:',
                '"""',
                fullText,
                '"""',
                '',
                'It FAILED because it violated the constraint.',
                `Reason: ${validatorError}`,
                restartingFromScratch
                    ? 'There is no valid prefix (the failure happened immediately).'
                    : `The last valid prefix ends at character ${prefixLen}.`,
                '',
                'Context around the failure:',
                '--- BEFORE (valid) ---',
                excerptBefore || '(empty)',
                '--- AFTER (invalid) ---',
                excerptAfter || '(empty)',
                '',
                'Task:',
                restartingFromScratch
                    ? '1) Restart from scratch (fresh beginning), do NOT reuse the invalid text.'
                    : '1) Start exactly from the last valid prefix ONLY (do not repeat it).',
                restartingFromScratch
                    ? '2) Write a new coherent text, more conservative.'
                    : '2) Continue the SAME text (same topic/tone/style) so the overall text stays coherent.',
                '3) Be conservative: short sentences, simple low-risk words.',
                '4) Do not mention the rules or that you are correcting.',
                '5) Start directly with a word (no leading whitespace).',
                'Only output the continuation to append.',
            ].join('\n');
        };

        const streamOnce = async (args: {
            system: string;
            prompt: string;
            temperature: number;
            baseText: string;
            rollbackWholeWordOnFail: boolean;
            hardRollbackMode: HardRetryRollbackMode;
        }): Promise<
            | { ok: true; text: string }
            | { ok: false; reason: string; lastValidPrefix: string; fullText: string }
        > => {
            const { system, prompt, temperature, baseText, rollbackWholeWordOnFail, hardRollbackMode } = args;

            const controller = new AbortController();
            abortRef.current = controller;

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
                        temperature,
                    }),
                });
            } catch (e) {
                // Abort is normal.
                if (controller.signal.aborted) {
                    return { ok: false, reason: 'aborted', lastValidPrefix: baseText, fullText: baseText };
                }
                return {
                    ok: false,
                    reason: e instanceof Error ? e.message : 'Request failed',
                    lastValidPrefix: baseText,
                    fullText: baseText,
                };
            }

            if (!res.ok) {
                return {
                    ok: false,
                    reason: await res.text().catch(() => 'Request failed'),
                    lastValidPrefix: baseText,
                    fullText: baseText,
                };
            }

            const reader = res.body?.getReader();
            if (!reader) {
                return { ok: false, reason: 'No response body', lastValidPrefix: baseText, fullText: baseText };
            }

            const decoder = new TextDecoder();
            let acc = baseText;
            let firstChunk = true;

            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    let chunk = decoder.decode(value, { stream: true });

                    // Avoid bad joins between a rolled-back prefix and the model continuation.
                    if (firstChunk) {
                        firstChunk = false;
                        // If the prefix already ends with whitespace, drop leading whitespace.
                        if (/\s$/.test(baseText)) chunk = chunk.replace(/^\s+/, '');

                        // If the prefix ends with an apostrophe (French elision), do not allow whitespace,
                        // and avoid doubling the apostrophe.
                        if (/["'’]$/.test(baseText)) {
                            chunk = chunk.replace(/^\s+/, '');
                            chunk = chunk.replace(/^["'’]+/, '');
                        }
                    }

                    acc += chunk;
                    setText(acc);
                    onTextChange?.(acc);

                    // Validate during stream. If invalid, compute last valid prefix and stop.
                    if (constraint.id !== 'palindrome' && hasParam) {
                        if (!WORD_BASED_CONSTRAINTS.has(constraint.id) || endsWithBoundary(acc) || acc.length === 0) {
                            const v = constraint.validate(acc, param);
                            if (!v.isValid) {
                                // Find last valid prefix length (monotonic assumption).
                                let lo = 0;
                                let hi = acc.length;
                                const isValidAt = (n: number) => constraint.validate(acc.slice(0, n), param).isValid;
                                while (lo < hi) {
                                    const mid = Math.ceil((lo + hi) / 2);
                                    if (isValidAt(mid)) lo = mid;
                                    else hi = mid - 1;
                                }
                                const lastOk = lo;
                                const prefixRaw = acc.slice(0, lastOk);

                                // 1) Always rollback partial word.
                                let prefix = rollbackBrokenWordAndEnsureSpace(prefixRaw);
                                // 2) In hard mode retries, rollback further to reduce the chance of
                                // re-hitting the same violation.
                                if (rollbackWholeWordOnFail) {
                                    prefix =
                                        hardRollbackMode === 'sentence'
                                            ? removeLastSentence(prefix)
                                            : removeLastWord(prefix);
                                }

                                const bounds = findWordBounds(acc, lastOk);
                                onViolation?.({
                                    fullText: acc,
                                    lastValidPrefix: prefix,
                                    error: v.error ?? 'Constraint violation',
                                    highlightStart: bounds.start,
                                    highlightEnd: bounds.end,
                                });

                                if (truncateOnViolation) {
                                    setText(prefix);
                                    onTextChange?.(prefix);
                                } else {
                                    // Machine-only behavior (e.g. daily versus): keep the invalid tail visible.
                                    setText(acc);
                                    onTextChange?.(acc);
                                }
                                abortRef.current?.abort();
                                abortRef.current = null;
                                return {
                                    ok: false,
                                    reason: v.error ?? 'Constraint violation',
                                    lastValidPrefix: prefix,
                                    fullText: acc,
                                };
                            }
                        }
                    }
                }

                return { ok: true, text: acc };
            } catch (e) {
                if (controller.signal.aborted) {
                    return { ok: false, reason: 'aborted', lastValidPrefix: baseText, fullText: baseText };
                }
                return {
                    ok: false,
                    reason: e instanceof Error ? e.message : 'Stream error',
                    lastValidPrefix: baseText,
                    fullText: baseText,
                };
            }
        };

        // Attempt loop.
        let attempt = 1;
        let currentText = '';

        // Attempt 1: fresh text.
        const t1 = isHard ? 0.3 : 0.7;
        const r1 = await streamOnce({
            system: systemBase,
            prompt: initialPrompt,
            temperature: t1,
            baseText: '',
            rollbackWholeWordOnFail: false,
            hardRollbackMode: hardRetryRollbackMode,
        });
        if (r1.ok) {
            currentText = r1.text;
            if (statusRef.current === 'running') setStatus('stopped');
            return;
        }

        // If the user stopped the run, don't auto-retry.
        if (r1.reason === 'aborted') {
            if (statusRef.current === 'running') setStatus('stopped');
            return;
        }

        // Retry only if hard + early failure.
        currentText = r1.fullText;
        let lastValidPrefix = r1.lastValidPrefix;
        let lastErrorMessage = r1.reason;

        while (isHard && attempt < maxAttempts) {
            attempt += 1;
            // Only retry if the failure happened early.
            if (lastValidPrefix.length >= HARD_RETRY_IF_FAILED_BEFORE_CHARS) break;

            setAttemptInfo({ attempt, max: maxAttempts, retrying: true });

            // Build a retry prompt that keeps coherence with what's already there.
            const retryPrompt = buildRetryPrompt({
                fullText: currentText,
                lastValidPrefix,
                validatorError: lastErrorMessage,
                attemptIndex: attempt,
            });

            // Stream continuation, starting from last valid prefix.
            const r = await streamOnce({
                system: systemBase,
                prompt: retryPrompt,
                temperature: 0.25,
                baseText: lastValidPrefix,
                rollbackWholeWordOnFail: true,
                hardRollbackMode: hardRetryRollbackMode,
            });

            if (r.ok) {
                currentText = r.text;
                if (statusRef.current === 'running') setStatus('stopped');
                setAttemptInfo(null);
                return;
            }

            if (r.reason === 'aborted') {
                if (statusRef.current === 'running') setStatus('stopped');
                setAttemptInfo(null);
                return;
            }

            // Prepare next retry.
            currentText = r.fullText;
            lastValidPrefix = r.lastValidPrefix;
            lastErrorMessage = r.reason;
        }

        // If we reach here, we failed.
        setLastError(lastErrorMessage);
        setStatus('failed');
        setAttemptInfo(null);
        const q = pickQuip(lang, lastQuip);
        setLastQuip(q);
        setQuip(q);
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
            <div
                className={cn(
                    'inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[11px]',
                    attemptInfo?.retrying && status === 'running'
                        ? 'border-primary/30 bg-primary/5 text-primary'
                        : 'border-transparent text-transparent'
                )}
                aria-hidden={!(attemptInfo?.retrying && status === 'running')}
            >
                {attemptInfo?.retrying && status === 'running'
                    ? (lang === 'fr'
                        ? `Nouvelle tentative ${attemptInfo.attempt}/${attemptInfo.max}…`
                        : `Retrying ${attemptInfo.attempt}/${attemptInfo.max}…`)
                    : '…'}
            </div>
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

            <div className={cn("rounded-md border bg-muted/30 p-3 font-mono text-sm whitespace-pre-wrap", outputMinHeightClassName)}>
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

    if (!renderOutput) return null;
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
