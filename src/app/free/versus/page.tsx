"use client";

import { useMemo, useState } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { t } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ConstraintPicker, getConstraintById, type ConstraintId } from '@/components/constraint-picker';
import { ConstraintParameterInput } from '@/components/constraint-parameter-input';
import { ArenaRunner } from '@/components/arena-runner';
import { ConstrainedTextarea } from '@/components/constrained-textarea';
import { countWords } from '@/lib/text-metrics';

export default function FreeVersusPage() {
    const { settings } = useSettings();
    const lang = settings.lang;
    const s = t(lang);

    const [constraintId, setConstraintId] = useState<ConstraintId>('lipogram');
    const [param, setParam] = useState('');
    const constraint = useMemo(() => getConstraintById(constraintId), [constraintId]);

    const [humanText, setHumanText] = useState('');
    const [machineText, setMachineText] = useState('');

    const humanChars = humanText.length;
    const humanWords = useMemo(() => countWords(humanText), [humanText]);
    const machineChars = machineText.length;
    const machineWords = useMemo(() => countWords(machineText), [machineText]);

    const resetBoth = () => {
        setHumanText('');
        setMachineText('');
    };

    return (
        <main className="min-h-screen w-full bg-background">
            <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-8">
                <header className="space-y-2">
                    <h1 className="text-3xl font-bold">{s.versus.title} (libre)</h1>
                    <p className="text-sm text-muted-foreground">{s.versus.description}</p>
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
                                resetBoth();
                            }}
                        />

                        {constraint.parameter.kind !== 'none' && (
                            <div className="space-y-2">
                                <Label>{constraint.parameter.label}</Label>
                                <ConstraintParameterInput
                                    constraint={constraint}
                                    value={param}
                                    onChange={(p) => {
                                        setParam(p);
                                        resetBoth();
                                    }}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between gap-2">
                                <CardTitle className="text-base">{s.versus.human}</CardTitle>
                                <div className="text-xs text-muted-foreground">
                                    {humanChars} {s.common.chars} • {humanWords} {s.common.words}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ConstrainedTextarea
                                constraint={constraint}
                                param={param}
                                value={humanText}
                                onChange={setHumanText}
                                placeholder={lang === 'fr' ? 'À vous…' : 'Your turn…'}
                                rows={12}
                                blockInvalidEdits
                                showError
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between gap-2">
                                <CardTitle className="text-base">{s.versus.machine}</CardTitle>
                                <div className="text-xs text-muted-foreground">
                                    {machineChars} {s.common.chars} • {machineWords} {s.common.words}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ArenaRunner
                                lang={lang}
                                constraint={constraint}
                                param={param}
                                steeringEnabled={false}
                                onTextChange={setMachineText}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}

