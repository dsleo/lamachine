"use client";

import { useMemo, useState } from 'react';
import type { Lang } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { normalizeNickname, isValidNickname } from '@/lib/nickname';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function SubmitScoreDialog(props: {
    lang: Lang;
    triggerLabel: string;
    disabled?: boolean;
    onSubmit: (nickname: string) => Promise<void> | void;
}) {
    const { lang, triggerLabel, disabled, onSubmit } = props;
    const s = t(lang);

    const [open, setOpen] = useState(false);
    const [nickname, setNickname] = useState('');
    const normalized = useMemo(() => normalizeNickname(nickname), [nickname]);
    const valid = useMemo(() => isValidNickname(normalized), [normalized]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            await onSubmit(normalized);
            setOpen(false);
            setNickname('');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Submit failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" disabled={disabled}>
                    {triggerLabel}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{lang === 'fr' ? 'Entrer un pseudo' : 'Enter nickname'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                        {lang === 'fr'
                            ? '3–10 caractères: A–Z 0–9 _ -'
                            : '3–10 chars: A–Z 0–9 _ -'}
                    </div>
                    <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder={lang === 'fr' ? 'EX: PEREC' : 'E.g. PEREC'} />
                    <div className="text-xs text-muted-foreground">{normalized || '—'}</div>
                    {error && <div className="text-sm text-destructive">{error}</div>}
                </div>

                <DialogFooter>
                    <Button variant="secondary" onClick={() => setOpen(false)}>
                        {lang === 'fr' ? 'Annuler' : 'Cancel'}
                    </Button>
                    <Button onClick={submit} disabled={!valid || submitting}>
                        {lang === 'fr' ? 'Envoyer' : 'Submit'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

