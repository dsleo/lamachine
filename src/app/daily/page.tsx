"use client";

import Link from 'next/link';
import { useMemo } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { t } from '@/lib/i18n';
import { getDailyChallenge, getParisDayKey } from '@/lib/daily';
import { getConstraintById } from '@/lib/constraints';
import { Card, CardContent } from '@/components/ui/card';

export default function DailyPage() {
    const { settings } = useSettings();
    const lang = settings.lang;
    const s = t(lang);

    const todayKey = useMemo(() => getParisDayKey(), []);
    const challenge = useMemo(() => getDailyChallenge(todayKey), [todayKey]);
    const constraint = useMemo(() => getConstraintById(challenge.constraintId), [challenge.constraintId]);

    const todayLong = useMemo(() => {
        const d = new Date();
        return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
            timeZone: 'Europe/Paris',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(d);
    }, [lang]);

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
            <div className="mx-auto w-full max-w-5xl space-y-6 p-6 sm:p-10">
                <header className="space-y-2">
                    <h1 className="text-4xl font-bold">
                        {lang === 'fr' ? `Contrainte du ${todayLong}` : `Daily constraint — ${todayLong}`}
                    </h1>
                </header>

                <Card>
                    <CardContent className="pt-6">
                        <div className="text-xl font-semibold">{sentence}</div>
                        <div className="mt-2 text-sm text-muted-foreground">{explanation}</div>

                        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Link
                                href="/daily/coach"
                                className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <div className="text-base font-semibold">{lang === 'fr' ? 'Coach' : 'Coach'}</div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    {lang === 'fr'
                                        ? 'Vous donnez une consigne simple (thème, ton…), puis la Machine écrit. Vous choisissez quand envoyer.'
                                        : 'You give a simple instruction (theme, tone…), then the Machine writes. You decide when to submit.'}
                                </div>
                            </Link>

                            <Link
                                href="/daily/versus"
                                className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <div className="text-base font-semibold">{lang === 'fr' ? 'Humain vs Machine' : 'Human vs Machine'}</div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    {lang === 'fr'
                                        ? 'Vous écrivez votre texte sous contrainte. La Machine écrit en parallèle. Envoyez votre version.'
                                        : 'You write your constrained text. The Machine writes in parallel. Submit your version.'}
                                </div>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
