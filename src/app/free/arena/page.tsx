"use client";

import { useMemo, useState } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { t } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ConstraintPicker, getConstraintById, type ConstraintId } from '@/components/constraint-picker';
import { ConstraintParameterInput } from '@/components/constraint-parameter-input';
import { ArenaRunner } from '@/components/arena-runner';

export default function FreeArenaPage() {
    const { settings } = useSettings();
    const lang = settings.lang;
    const s = t(lang);

    const [constraintId, setConstraintId] = useState<ConstraintId>('lipogram');
    const [param, setParam] = useState('');

    const constraint = useMemo(() => getConstraintById(constraintId), [constraintId]);

    const requiresParam = constraint.parameter.kind !== 'none';
    const hasParam = !requiresParam || !!param;

    return (
        <main className="min-h-screen w-full bg-background">
            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
                <header className="space-y-2">
                    <h1 className="text-3xl font-bold">Coach (libre)</h1>
                    <p className="text-sm text-muted-foreground">Streaming + stop on first violation.</p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{s.common.constraint}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ConstraintPicker
                            value={constraintId}
                            onChange={(id) => {
                                setConstraintId(id);
                                setParam('');
                            }}
                        />

                        {constraint.parameter.kind !== 'none' && (
                            <div className="space-y-2">
                                <Label>{constraint.parameter.label}</Label>
                                <ConstraintParameterInput constraint={constraint} value={param} onChange={setParam} />
                            </div>
                        )}

                        {requiresParam && !hasParam && (
                            <div className="text-xs text-muted-foreground">Veuillez renseigner le paramètre pour lancer.</div>
                        )}
                    </CardContent>
                </Card>

                <ArenaRunner lang={lang} constraint={constraint} param={param} />
            </div>
        </main>
    );
}
