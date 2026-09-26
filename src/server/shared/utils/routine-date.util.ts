const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

export function getSeoulDateString(date: Date = new Date()): string {
    const seoul = new Date(date.getTime() + SEOUL_OFFSET_MS);
    return seoul.toISOString().slice(0, 10);
}

export function parseSeoulDate(dateStr: string): Date {
    return new Date(`${dateStr}T00:00:00.000Z`);
}

export function getSeoulWeekStart(dateStr: string): string {
    const date = parseSeoulDate(dateStr);
    const day = date.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;
    date.setUTCDate(date.getUTCDate() - diff);
    return date.toISOString().slice(0, 10);
}

export function getSeoulWeekDates(weekStart: string): string[] {
    const dates: string[] = [];
    const start = parseSeoulDate(weekStart);
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setUTCDate(start.getUTCDate() + i);
        dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
}
