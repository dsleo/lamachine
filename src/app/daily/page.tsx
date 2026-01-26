"use client";

import Link from 'next/link';
import { useMemo } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { getDailyChallengeForMode, getParisDayKey } from '@/lib/daily';
import { getConstraintById } from '@/lib/constraints';

export default function DailyPage() {
    const { settings } = useSettings();
    const lang = settings.lang;

    const todayKey = useMemo(() => getParisDayKey(), []);
    // Landing page is a generic entrypoint; use the coach pool.
    const challenge = useMemo(() => getDailyChallengeForMode({ dayKey: todayKey, mode: 'coach' }), [todayKey]);
    const constraint = useMemo(() => getConstraintById(challenge.constraintId), [challenge.constraintId]);

    const sentence = useMemo(() => {
        if (challenge.constraintId === 'lipogram') {
            return lang === 'fr'
                ? `Écrire un lipogramme sans la lettre “${challenge.param}”.`
                : `Write a lipogram without the letter “${challenge.param}”.`;
        }
        if (challenge.constraintId === 'monovocalism') {
            return lang === 'fr'
                ? `Écrire un texte avec une seule voyelle: “${challenge.param}”.`
                : `Write a text with a single vowel: “${challenge.param}”.`;
        }
        if (challenge.constraintId === 'tautogram') {
            return lang === 'fr'
                ? `Écrire un tautogramme: chaque mot commence par “${challenge.param}”.`
                : `Write a tautogram: every word starts with “${challenge.param}”.`;
        }
        if (challenge.constraintId === 'alliteration') {
            return lang === 'fr'
                ? `Écrire une allitération: chaque mot commence par “${challenge.param}”.`
                : `Write an alliteration: every word starts with “${challenge.param}”.`;
        }
        if (challenge.constraintId === 'snowball') {
            return lang === 'fr'
                ? 'Écrire une “boule de neige”: chaque mot doit être plus long d’une lettre que le précédent.'
                : 'Write a “snowball”: each word is one letter longer than the previous one.';
        }
        if (challenge.constraintId === 'beau-present') {
            return lang === 'fr'
                ? `Écrire un “beau présent” en utilisant uniquement les lettres de: ${challenge.param}.`
                : `Write a “beautiful present” using only letters from: ${challenge.param}.`;
        }
        if (challenge.constraintId === 'pangram') {
            return lang === 'fr' ? 'Écrire un pangramme.' : 'Write a pangram.';
        }
        if (challenge.constraintId === 'pangram-strict') {
            return lang === 'fr'
                ? 'Écrire un pangramme strict (chaque lettre une seule fois).'
                : 'Write a strict pangram (each letter only once).';
        }
        return constraint.name;
    }, [challenge.constraintId, challenge.param, constraint.name, lang]);

    const explanation = useMemo(() => {
        if (challenge.constraintId === 'lipogram') {
            return lang === 'fr'
                ? 'Un lipogramme est un texte qui n’utilise jamais une lettre donnée.'
                : 'A lipogram is a text that never uses a given letter.';
        }
        if (challenge.constraintId === 'monovocalism') {
            return lang === 'fr'
                ? 'Monovocalisme: une seule voyelle est autorisée dans tout le texte.'
                : 'Monovocalism: only one vowel is allowed in the whole text.';
        }
        if (challenge.constraintId === 'tautogram') {
            return lang === 'fr'
                ? 'Tautogramme: tous les mots commencent par la même lettre.'
                : 'Tautogram: all words start with the same letter.';
        }
        if (challenge.constraintId === 'alliteration') {
            return lang === 'fr'
                ? 'Allitération: tous les mots commencent par la même consonne.'
                : 'Alliteration: all words start with the same consonant.';
        }
        if (challenge.constraintId === 'snowball') {
            return lang === 'fr'
                ? 'Boule de neige: chaque mot est plus long d’une lettre que le précédent.'
                : 'Snowball: each word is one letter longer than the previous one.';
        }
        if (challenge.constraintId === 'beau-present') {
            return lang === 'fr'
                ? 'Beau présent: le texte n’utilise que les lettres présentes dans une phrase donnée.'
                : 'Beautiful present: the text can only use letters from a given phrase.';
        }
        if (challenge.constraintId === 'pangram') {
            return lang === 'fr'
                ? 'Pangramme: utilisez toutes les lettres de l’alphabet au moins une fois.'
                : 'Pangram: use every letter of the alphabet at least once.';
        }
        if (challenge.constraintId === 'pangram-strict') {
            return lang === 'fr'
                ? 'Pangramme strict: chaque lettre doit être utilisée exactement une fois.'
                : 'Strict pangram: each letter must be used exactly once.';
        }
        return constraint.description;
    }, [challenge.constraintId, constraint.description, lang]);

    return (
        <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-6">
            <div className="w-full max-w-3xl space-y-6 text-center">
                <header className="space-y-3">
                    <div className="mx-auto w-fit rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
                        {lang === 'fr' ? 'Contrainte du jour' : 'Today’s challenge'}
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight">{sentence}</h1>
                    <p className="text-muted-foreground">{explanation}</p>
                    <p className="text-xs text-muted-foreground">
                        {lang === 'fr'
                            ? 'Un jeu. Une nouvelle contrainte chaque jour.'
                            : 'A game. A new constraint every day.'}
                    </p>
                </header>

                <div className="grid grid-cols-1 gap-4">
                    <Link
                        href="/daily/versus"
                        className="group rounded-2xl border bg-card p-6 text-left transition-all hover:-translate-y-[1px] hover:bg-accent/30 hover:border-primary/50"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-lg font-semibold">{lang === 'fr' ? 'Battez la Machine' : 'Beat the Machine'}</div>
                            <div className="text-xs text-muted-foreground group-hover:text-foreground">→</div>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">{lang === 'fr' ? 'Écrivez plus loin.' : 'Write farther.'}</div>
                    </Link>
                </div>
            </div>
        </main>
    );
}
