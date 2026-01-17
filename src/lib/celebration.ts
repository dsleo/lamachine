export type CelebrationQuery = {
    celebrate: boolean;
    mode?: 'coach' | 'versus';
    dayKey?: string;
    chars?: number;
    constraintId?: string;
    param?: string;
};

function parseMaybeNumber(v: string | null): number | undefined {
    if (v == null || v.trim() === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}

export function parseCelebrationQuery(searchParams: URLSearchParams): CelebrationQuery {
    const celebrate = searchParams.get('celebrate') === '1';
    const modeRaw = searchParams.get('mode');
    const mode = modeRaw === 'coach' || modeRaw === 'versus' ? modeRaw : undefined;

    return {
        celebrate,
        mode,
        dayKey: searchParams.get('dayKey') ?? undefined,
        chars: parseMaybeNumber(searchParams.get('chars')),
        constraintId: searchParams.get('constraintId') ?? undefined,
        param: searchParams.get('param') ?? undefined,
    };
}

