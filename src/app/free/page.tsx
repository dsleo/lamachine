"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FreeMenuPage() {
    return (
        <main className="min-h-screen w-full bg-background">
            <div className="mx-auto w-full max-w-3xl space-y-6 p-6 sm:p-10">
                <header className="space-y-2">
                    <h1 className="text-4xl font-bold">Libre</h1>
                    <p className="text-sm text-muted-foreground">Choisissez vos contraintes et jouez librement.</p>
                </header>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Link href="/free/arena" className="rounded-lg border bg-card p-6 text-left hover:bg-accent/30">
                        <div className="text-lg font-semibold">Coach (libre)</div>
                        <div className="mt-1 text-sm text-muted-foreground">Streaming + stop on first violation.</div>
                    </Link>
                    <Link href="/free/versus" className="rounded-lg border bg-card p-6 text-left hover:bg-accent/30">
                        <div className="text-lg font-semibold">Versus (libre)</div>
                        <div className="mt-1 text-sm text-muted-foreground">Length race under the same constraint.</div>
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Note</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        La Campaign est le mode “arcade” (mêmes niveaux pour tout le monde, leaderboard).
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
