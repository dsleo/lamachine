export function startOfWeek(d: Date): Date {
    const date = new Date(d);
    const day = date.getUTCDay();
    const diff = (day + 6) % 7; // Monday as week start
    date.setUTCDate(date.getUTCDate() - diff);
    date.setUTCHours(0, 0, 0, 0);
    return date;
}

export function startOfMonth(d: Date): Date {
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    date.setUTCHours(0, 0, 0, 0);
    return date;
}

