export function normalizeNickname(raw: string): string {
    const trimmed = raw.trim();
    // Arcade style: keep A-Z0-9_- ; preserve user casing.
    const cleaned = trimmed
        .replace(/[^A-Za-z0-9_-]/g, '')
        .slice(0, 10);
    return cleaned;
}

export function isValidNickname(nickname: string): boolean {
    return /^[A-Za-z0-9_-]{3,10}$/.test(nickname);
}
