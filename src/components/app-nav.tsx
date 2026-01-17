"use client";

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsDialog } from '@/components/settings-dialog';
import { useSettings } from '@/hooks/use-settings';
import { t } from '@/lib/i18n';

export function AppNav() {
    const router = useRouter();
    const pathname = usePathname();
    const { settings } = useSettings();
    const s = t(settings.lang);

    // Don’t show nav on the landing page.
    const hidden = pathname === '/';
    if (hidden) return null;

    return (
        <nav className="flex w-full items-center justify-center border-b bg-background px-4 py-3">
            <div className="flex w-full max-w-6xl items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/" aria-label={s.nav.home}>
                            <Home className="mr-2 h-4 w-4" />
                            Menu
                        </Link>
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        aria-label="Back"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>

                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/leaderboard" aria-label="Leaderboard">
                            Leaderboard
                        </Link>
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <SettingsDialog />
                </div>
            </div>
        </nav>
    );
}
