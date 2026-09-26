const STORAGE_PREFIX = "heailth_routine_week_anchor";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function storageKey(routineId: string) {
  return `${STORAGE_PREFIX}:${routineId}`;
}

export function getRoutineWeekAnchor(routineId: string): number {
  const key = storageKey(routineId);
  const stored = localStorage.getItem(key);
  if (stored) {
    const parsed = Number(stored);
    if (!Number.isNaN(parsed)) return parsed;
  }

  const now = Date.now();
  localStorage.setItem(key, String(now));
  return now;
}

export function resetRoutineWeekAnchor(routineId: string, timestamp = Date.now()) {
  localStorage.setItem(storageKey(routineId), String(timestamp));
}

export function isRoutineWeekExpired(routineId: string): boolean {
  const anchor = getRoutineWeekAnchor(routineId);
  return Date.now() - anchor >= WEEK_MS;
}

export function getRoutineRefreshRemainingMs(routineId: string): number {
  const anchor = getRoutineWeekAnchor(routineId);
  return Math.max(0, WEEK_MS - (Date.now() - anchor));
}

export interface RoutineRefreshCountdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function getRoutineRefreshCountdown(
  routineId: string,
): RoutineRefreshCountdown {
  const remaining = getRoutineRefreshRemainingMs(routineId);
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor(
    (remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000),
  );
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

  return { days, hours, minutes, seconds };
}

export function formatRoutineRefreshCountdown(
  countdown: RoutineRefreshCountdown,
): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${countdown.days}:${pad(countdown.hours)}:${pad(countdown.minutes)}:${pad(countdown.seconds)}`;
}
