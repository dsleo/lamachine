"use client";

import { useEffect, useState } from 'react';
import type { Settings } from '@/lib/settings';
import { getDefaultSettings, loadSettings, saveSettings } from '@/lib/settings';

export function useSettings() {
    const [settings, setSettings] = useState<Settings>(getDefaultSettings());

    useEffect(() => {
        setSettings(loadSettings());
    }, []);

    const update = (patch: Partial<Settings>) => {
        setSettings((prev) => {
            const next = { ...prev, ...patch };
            saveSettings(next);
            return next;
        });
    };

    return { settings, update };
}

