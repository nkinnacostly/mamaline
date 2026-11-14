// Calendar days in Nigeria (West Africa Time, UTC+1, no daylight saving).
const WAT_OFFSET = 3600_000;
const DAY = 24 * 3600 * 1000;

export const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-11-14" for a moment in time, in Nigerian local time. */
export function dayKey(ms: number): string {
  return new Date(ms + WAT_OFFSET).toISOString().slice(0, 10);
}

/** The first millisecond of a local day. */
export function dayStart(key: string): number {
  return Date.parse(`${key}T00:00:00Z`) - WAT_OFFSET;
}

export function addDays(key: string, n: number): string {
  return dayKey(dayStart(key) + n * DAY + DAY / 2);
}

/** The Sunday that starts the week containing `key`. */
export function weekStart(key: string): string {
  const weekday = new Date(`${key}T12:00:00Z`).getUTCDay();
  return addDays(key, -weekday);
}
