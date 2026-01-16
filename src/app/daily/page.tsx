"use client";

import Link from 'next/link';
import { useMemo } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { getDailyChallenge, getParisDayKey } from '@/lib/daily';
import { getConstraintById } from '@/lib/constraints';

export default function DailyPage() {
    const { settings } = useSettings();
    const lang = settings.lang;

    const todayKey = useMemo(() => getParisDayKey(), []);
    const challenge = useMemo(() => getDailyChallenge(todayKey), [todayKey]);
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
        return constraint.description;
    }, [challenge.constraintId, constraint.description, lang]);

    return (
        <main className="min-h-screen w-full bg-background">
            <div className="mx-auto w-full max-w-5xl space-y-8 p-6 sm:p-10">
                <header className="space-y-3">
                    <h1 className="text-4xl font-bold tracking-tight">{sentence}</h1>
                </header>

                <section className="rounded-2xl border bg-card p-6 shadow-sm">
                    <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">{explanation}</div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Link
                            href="/daily/coach"
                            className="group rounded-2xl border bg-background p-5 transition-all hover:-translate-y-[1px] hover:border-primary/50 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-lg font-semibold">Coach</div>
                                <div className="text-xs text-muted-foreground group-hover:text-foreground">→</div>
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                                {lang === 'fr'
                                    ? 'Vous donnez une consigne (thème, ton…), la Machine écrit.'
                                    : 'You give an instruction (theme, tone…), the Machine writes.'}
                            </div>
                        </Link>

                        <Link
                            href="/daily/versus"
                            className="group rounded-2xl border bg-background p-5 transition-all hover:-translate-y-[1px] hover:border-primary/50 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-lg font-semibold">{lang === 'fr' ? 'Humain vs Machine' : 'Human vs Machine'}</div>
                                <div className="text-xs text-muted-foreground group-hover:text-foreground">→</div>
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                                {lang === 'fr'
                                    ? 'Vous écrivez votre texte. La Machine écrit en parallèle.'
                                    : 'You write your text. The Machine writes in parallel.'}
                            </div>
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}
