const TZ = "Africa/Lagos";

/** +2348031234567 -> 0803 123 4567 (how health workers write numbers), never split across lines. */
export function localPhone(e164: string): string {
  const m = /^\+234(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `0${m[1]}\u00a0${m[2]}\u00a0${m[3]}` : e164;
}

export function telHref(e164: string): string {
  return `tel:${e164}`;
}

export function greeting(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: TZ }).format(now));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function longDate(now: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(now);
}

/** "2026-11-14" -> "Sat 14 Nov" */
export function shortDay(key: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));
}

export function monthLabel(key: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));
}

export function dayNumber(key: string): number {
  return Number(key.slice(8, 10));
}

export function weekdayLetter(key: string): string {
  return "SMTWTFS"[new Date(`${key}T12:00:00Z`).getUTCDay()];
}

/** "11:00 AM" in Nigerian time. */
export function time(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ }).format(new Date(iso));
}

/** "11:00 AM" today, otherwise "Sat 14 Nov". */
export function when(iso: string, todayKey: string): string {
  const key = dayKeyOf(iso);
  return key === todayKey ? time(iso) : shortDay(key);
}

/** "2026-11-14": the day in Nigeria for a moment in time. */
export function dayKeyOf(at: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(at));
}

/** "today", "tomorrow", "yesterday", otherwise "Sat 14 Nov". */
export function relativeDay(iso: string, todayKey: string): string {
  const key = dayKeyOf(iso);
  if (key === todayKey) return "today";
  if (key === addDays(todayKey, 1)) return "tomorrow";
  if (key === addDays(todayKey, -1)) return "yesterday";
  return shortDay(key);
}

export function addDays(key: string, n: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function firstName(name: string): string {
  return name.replace(/\(.*?\)/g, "").trim().split(/\s+/)[0] ?? name;
}
