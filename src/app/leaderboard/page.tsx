import { Suspense } from 'react';
import { LeaderboardClient } from './leaderboard-client';

export default function LeaderboardPage() {
    return (
        <Suspense fallback={<div className="min-h-screen w-full bg-background" />}>
            <LeaderboardClient />
        </Suspense>
    );
}

