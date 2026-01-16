"use client";

import { CampaignVersus } from '@/components/campaign-versus';

export default function VersusPage() {
    return (
        <main className="min-h-screen w-full bg-background">
            <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-8">
                <CampaignVersus />
            </div>
        </main>
    );
}
