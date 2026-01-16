import type { Lang } from '@/lib/i18n';
import type { CampaignId } from '@/lib/campaign';
import { normalizeNickname } from '@/lib/nickname';

export type CampaignMode = 'arena' | 'versus';

export type CampaignSession = {
    campaignId: CampaignId;
    mode: CampaignMode;
    lang: Lang;
    nickname: string;
};

const KEY = 'la-machine:campaign-session:v1';

export function loadCampaignSession(): CampaignSession | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as CampaignSession;
        if (!parsed?.campaignId || !parsed?.mode || !parsed?.lang || !parsed?.nickname) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function saveCampaignSession(input: {
    campaignId: CampaignId;
    mode: CampaignMode;
    lang: Lang;
    nickname: string;
}): CampaignSession {
    const s: CampaignSession = {
        campaignId: input.campaignId,
        mode: input.mode,
        lang: input.lang,
        nickname: normalizeNickname(input.nickname),
    };
    window.localStorage.setItem(KEY, JSON.stringify(s));
    return s;
}

export function clearCampaignSession() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(KEY);
}

