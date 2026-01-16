export function normalizeNickname(raw: string): string {
    const trimmed = raw.trim();
    // Arcade style: keep A-Z0-9_- ; uppercase.
    const cleaned = trimmed
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, '')
        .slice(0, 10);
    return cleaned;
}

export function isValidNickname(nickname: string): boolean {
    return /^[A-Z0-9_-]{3,10}$/.test(nickname);
}

