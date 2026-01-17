"use client";

import { useMemo } from 'react';
import type { Lang } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export type CelebrationData = {
    mode?: 'coach' | 'versus';
    dayKey?: string;
    chars?: number;
    constraintLabel?: string;
};

function buildShareText(args: { lang: Lang; data: CelebrationData }) {
    const { lang, data } = args;

    const modeLabel =
        data.mode === 'versus'
            ? lang === 'fr'
                ? 'battu'
                : 'beat'
            : lang === 'fr'
                ? 'coaché'
                : 'coached';

    const constraint = data.constraintLabel ? ` (${data.constraintLabel})` : '';
    const chars = typeof data.chars === 'number' ? ` — ${data.chars} ${lang === 'fr' ? 'caractères' : 'chars'}` : '';

    if (lang === 'fr') {
        return `J’ai ${modeLabel} La Machine${constraint}${chars}. À vous de jouer !`;
    }
    return `I just ${modeLabel} La Machine${constraint}${chars}. Your turn!`;
}

function buildTwitterIntentUrl(args: { text: string; url: string }) {
    const u = new URL('https://twitter.com/intent/tweet');
    u.searchParams.set('text', args.text);
    u.searchParams.set('url', args.url);
    return u.toString();
}

function buildLinkedInShareUrl(args: { url: string }) {
    const u = new URL('https://www.linkedin.com/sharing/share-offsite/');
    u.searchParams.set('url', args.url);
    return u.toString();
}

export function CelebrationBanner(props: {
    lang: Lang;
    data: CelebrationData;
    onClose: () => void;
}) {
    const { lang, data, onClose } = props;

    const shareUrl = useMemo(() => {
        if (typeof window === 'undefined') return 'https://lamachine.ai/leaderboard';
        return `${window.location.origin}/leaderboard`;
    }, []);

    const shareText = useMemo(() => buildShareText({ lang, data }), [lang, data]);

    return (
        <Card className="border-primary/40 bg-primary/5">
            <CardContent className="pt-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                        <div className="text-xl font-semibold">
                            {lang === 'fr' ? 'Bravo !' : 'Congrats!'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {lang === 'fr'
                                ? 'Votre score a été accepté et ajouté au leaderboard.'
                                : 'Your score was accepted and added to the leaderboard.'}
                        </div>

                        {(data.constraintLabel || typeof data.chars === 'number') && (
                            <div className="text-xs text-muted-foreground">
                                {data.constraintLabel ? <span className="font-medium text-foreground">{data.constraintLabel}</span> : null}
                                {data.constraintLabel && typeof data.chars === 'number' ? <span className="opacity-60"> • </span> : null}
                                {typeof data.chars === 'number' ? (
                                    <span className="tabular-nums">{data.chars} {lang === 'fr' ? 'caractères' : 'chars'}</span>
                                ) : null}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button asChild size="sm" variant="secondary">
                            <a
                                href={buildTwitterIntentUrl({ text: shareText, url: shareUrl })}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {lang === 'fr' ? 'Partager sur X' : 'Share on X'}
                            </a>
                        </Button>
                        <Button asChild size="sm" variant="secondary">
                            <a
                                href={buildLinkedInShareUrl({ url: shareUrl })}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {lang === 'fr' ? 'Partager sur LinkedIn' : 'Share on LinkedIn'}
                            </a>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={onClose}>
                            {lang === 'fr' ? 'Fermer' : 'Close'}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

