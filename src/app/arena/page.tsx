"use client";

import { CampaignArena } from '@/components/campaign-arena';

export default function ArenaPage() {
    return (
        <main className="min-h-screen w-full bg-background">
            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
                <CampaignArena />
            </div>
        </main>
    );
}
