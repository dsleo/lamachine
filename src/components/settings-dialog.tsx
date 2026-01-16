"use client";

import { Settings2 } from 'lucide-react';
import type { Lang } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { useSettings } from '@/hooks/use-settings';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SettingsDialog() {
    const { settings, update } = useSettings();
    const s = t(settings.lang);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Settings">
                    <Settings2 className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">{s.common.language}</div>
                    <Select value={settings.lang} onValueChange={(v) => update({ lang: v as Lang })}>
                        <SelectTrigger className="w-[220px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="fr">{s.common.french}</SelectItem>
                            <SelectItem value="en">{s.common.english}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </DialogContent>
        </Dialog>
    );
}

