import { FAQ, TIPS, type Faq, type Tip } from './messages.js';

export const DAY = 24 * 3600 * 1000;
const WEEK = 7 * DAY;

// WHO 2016 antenatal care model: 8 contacts, the first by 12 weeks.
export const ANC_WEEKS = [12, 20, 26, 30, 34, 36, 38, 40] as const;

// Nigeria routine immunisation schedule (NPHCDA). Confirm against the current national schedule.
export const VACCINES = [
  { key: 'vx-birth', week: 0, label: 'birth', names: 'BCG, OPV 0, Hep B' },
  { key: 'vx-6w', week: 6, label: '6-week', names: 'Penta 1, PCV 1, OPV 1, Rota 1' },
  { key: 'vx-10w', week: 10, label: '10-week', names: 'Penta 2, PCV 2, OPV 2, Rota 2' },
  { key: 'vx-14w', week: 14, label: '14-week', names: 'Penta 3, PCV 3, OPV 3, IPV, Rota 3' },
  { key: 'vx-9m', week: 39, label: '9-month', names: 'Measles 1, Yellow fever, MenA' },
  { key: 'vx-15m', week: 65, label: '15-month', names: 'Measles 2' },
] as const;

/** What the scheduler needs to know about a mother. */
export type CareSubject = {
  track: 'PREGNANCY' | 'BABY';
  expectedDueDate: Date | null;
  babyBirthDate: Date | null;
  /** Reminders due before this are not chased (registration, or the recorded birth). */
  trackStartedAt: Date;
  /** Item keys she has confirmed, e.g. "anc-30". */
  done: ReadonlySet<string>;
  /** Scheduled-message keys already sent, e.g. "anc-30:pre". */
  sent: ReadonlySet<string>;
};

export type CareItem =
  | { key: string; kind: 'anc'; week: number; due: number }
  | { key: string; kind: 'vaccine'; week: number; label: string; names: string; due: number };

export type DueEvent =
  | { type: 'reminder'; item: CareItem; stage: 'pre' | 'due' | 'missed'; key: string }
  | { type: 'tip'; tip: Tip; key: string }
  | { type: 'birthCheck'; key: string };

export function dueDateFromMonths(months: number, now: number): Date {
  const weeks = Math.round(months * 4.33);
  return new Date(now + (40 - weeks) * WEEK);
}

export function birthDateFromWeeks(weeks: number, now: number): Date {
  return new Date(now - weeks * WEEK);
}

export function gestationalWeeks(s: Pick<CareSubject, 'expectedDueDate'>, now: number): number {
  return Math.max(0, Math.floor(40 - (s.expectedDueDate!.getTime() - now) / WEEK));
}

export function babyWeeks(s: Pick<CareSubject, 'babyBirthDate'>, now: number): number {
  return Math.max(0, Math.floor((now - s.babyBirthDate!.getTime()) / WEEK));
}

export function currentWeek(s: CareSubject, now: number): number {
  return s.track === 'PREGNANCY' ? gestationalWeeks(s, now) : babyWeeks(s, now);
}

/** Every visit or vaccine in her schedule, with its due time in ms. */
export function careItems(s: CareSubject): CareItem[] {
  if (s.track === 'PREGNANCY') {
    const edd = s.expectedDueDate!.getTime();
    return ANC_WEEKS.map((week) => ({ key: `anc-${week}`, kind: 'anc' as const, week, due: edd - (40 - week) * WEEK }));
  }
  const dob = s.babyBirthDate!.getTime();
  return VACCINES.map((v) => ({ ...v, kind: 'vaccine' as const, due: dob + v.week * WEEK }));
}

/** Items we track: not already done and not due well before she started this track. */
export function trackedItems(s: CareSubject): CareItem[] {
  const started = s.trackStartedAt.getTime();
  return careItems(s).filter((item) => item.due >= started - 3 * DAY && !s.done.has(item.key));
}

/** The next visit or vaccine to tell her about (upcoming, or due within the last week). */
export function nextItem(s: CareSubject, now: number): CareItem | null {
  return trackedItems(s).find((item) => item.due >= now - 7 * DAY) ?? null;
}

/** The visit she is most likely confirming when she says "I went": due now, overdue, or within a week. */
export function confirmableItem(s: CareSubject, now: number): CareItem | null {
  return trackedItems(s).find((item) => item.due <= now + 7 * DAY && item.due >= now - 35 * DAY) ?? null;
}

export function latestTip(s: CareSubject, now: number): Tip | null {
  const track = s.track === 'PREGNANCY' ? 'pregnancy' : 'baby';
  const week = currentWeek(s, now);
  return TIPS.filter((tip) => tip.track === track && tip.week <= week).at(-1) ?? null;
}

/**
 * Messages that should go out now, each with a key so it is sent only once.
 * Windows: "pre" 2 days before, "due" for a week from the due date, "missed" from 7 to 35 days late.
 */
export function dueEvents(s: CareSubject, now: number): DueEvent[] {
  const events: DueEvent[] = [];
  for (const item of trackedItems(s)) {
    let stage: 'pre' | 'due' | 'missed' | null = null;
    if (now >= item.due - 2 * DAY && now < item.due) stage = 'pre';
    else if (now >= item.due && now < item.due + 7 * DAY) stage = 'due';
    else if (now >= item.due + 7 * DAY && now < item.due + 35 * DAY) stage = 'missed';
    if (!stage) continue;
    const key = `${item.key}:${stage}`;
    if (!s.sent.has(key)) events.push({ type: 'reminder', item, stage, key });
  }
  const tip = latestTip(s, now);
  if (tip && !s.sent.has(`tip:${tip.id}`)) events.push({ type: 'tip', tip, key: `tip:${tip.id}` });
  if (s.track === 'PREGNANCY' && now > s.expectedDueDate!.getTime() + 14 * DAY && !s.sent.has('birth-check')) {
    events.push({ type: 'birthCheck', key: 'birth-check' });
  }
  return events;
}

/** Offline answer: the validated tip or FAQ whose keywords best match the question. */
export function findContent(text: string): Faq | Tip | null {
  const words = new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  let best: Faq | Tip | null = null;
  let bestScore = 0;
  for (const entry of [...FAQ, ...TIPS]) {
    const score = entry.keywords.filter((k) => words.has(k)).length;
    if (score > bestScore) [best, bestScore] = [entry, score];
  }
  return best;
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' });
}
