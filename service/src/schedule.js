import { readFileSync } from "node:fs";

export const DAY = 24 * 3600 * 1000;
const WEEK = 7 * DAY;

// WHO 2016 antenatal care model: 8 contacts, the first by 12 weeks.
export const ANC_WEEKS = [12, 20, 26, 30, 34, 36, 38, 40];

// Nigeria routine immunisation schedule (NPHCDA). Confirm against the current national schedule.
export const VACCINES = [
  { key: "vx-birth", week: 0, label: "birth", names: "BCG, OPV 0, Hep B" },
  { key: "vx-6w", week: 6, label: "6-week", names: "Penta 1, PCV 1, OPV 1, Rota 1" },
  { key: "vx-10w", week: 10, label: "10-week", names: "Penta 2, PCV 2, OPV 2, Rota 2" },
  { key: "vx-14w", week: 14, label: "14-week", names: "Penta 3, PCV 3, OPV 3, IPV, Rota 3" },
  { key: "vx-9m", week: 39, label: "9-month", names: "Measles 1, Yellow fever, MenA" },
  { key: "vx-15m", week: 65, label: "15-month", names: "Measles 2" },
];

const CONTENT = JSON.parse(readFileSync(new URL("../knowledge/content.json", import.meta.url), "utf8"));
export const TIPS = CONTENT.tips;
export const FAQ = CONTENT.faq;

export function eddFromMonths(months, now) {
  const weeks = Math.round(months * 4.33);
  return new Date(now + (40 - weeks) * WEEK).toISOString();
}

export function dobFromWeeks(weeks, now) {
  return new Date(now - weeks * WEEK).toISOString();
}

export function gestationalWeeks(mother, now) {
  return Math.max(0, Math.floor(40 - (Date.parse(mother.edd) - now) / WEEK));
}

export function babyWeeks(mother, now) {
  return Math.max(0, Math.floor((now - Date.parse(mother.dob)) / WEEK));
}

export function currentWeek(mother, now) {
  return mother.status === "pregnant" ? gestationalWeeks(mother, now) : babyWeeks(mother, now);
}

// Every visit or vaccine in this mother's schedule, with its due time in ms.
export function careItems(mother) {
  if (mother.status === "pregnant") {
    const edd = Date.parse(mother.edd);
    return ANC_WEEKS.map((week) => ({ key: `anc-${week}`, kind: "anc", week, due: edd - (40 - week) * WEEK }));
  }
  const dob = Date.parse(mother.dob);
  return VACCINES.map((v) => ({ ...v, kind: "vaccine", due: dob + v.week * WEEK }));
}

// Items we track: not already done and not due well before she registered.
export function trackedItems(mother) {
  const registered = Date.parse(mother.registeredAt);
  return careItems(mother).filter((item) => item.due >= registered - 3 * DAY && !mother.done?.[item.key]);
}

// The next visit or vaccine to tell her about (upcoming, or due within the last week).
export function nextItem(mother, now) {
  return trackedItems(mother).find((item) => item.due >= now - 7 * DAY) ?? null;
}

// The visit she is most likely confirming when she says "I went": due now, overdue, or within a week.
export function confirmableItem(mother, now) {
  return trackedItems(mother).find((item) => item.due <= now + 7 * DAY && item.due >= now - 35 * DAY) ?? null;
}

export function latestTip(mother, now) {
  const track = mother.status === "pregnant" ? "pregnancy" : "baby";
  const week = currentWeek(mother, now);
  const eligible = TIPS.filter((tip) => tip.track === track && tip.week <= week);
  return eligible.at(-1) ?? null;
}

// Messages that should go out now. Each has a key so it is sent only once.
// Windows: "pre" 2 days before, "due" for a week from the due date, "missed" from 7 to 35 days late.
export function dueEvents(mother, now) {
  const sent = mother.sent ?? {};
  const events = [];
  for (const item of trackedItems(mother)) {
    let stage = null;
    if (now >= item.due - 2 * DAY && now < item.due) stage = "pre";
    else if (now >= item.due && now < item.due + 7 * DAY) stage = "due";
    else if (now >= item.due + 7 * DAY && now < item.due + 35 * DAY) stage = "missed";
    if (!stage) continue;
    const key = `${item.key}:${stage}`;
    if (!sent[key]) events.push({ type: "reminder", item, stage, key });
  }
  const tip = latestTip(mother, now);
  if (tip && !sent[`tip:${tip.id}`]) events.push({ type: "tip", tip, key: `tip:${tip.id}` });
  if (mother.status === "pregnant" && now > Date.parse(mother.edd) + 14 * DAY && !sent["birth-check"]) {
    events.push({ type: "birthCheck", key: "birth-check" });
  }
  return events;
}

// Offline answer: the validated tip or FAQ whose keywords best match the question.
export function findContent(text) {
  const words = new Set(String(text).toLowerCase().match(/[a-z0-9]+/g) ?? []);
  let best = null;
  let bestScore = 0;
  for (const entry of [...FAQ, ...TIPS]) {
    const score = entry.keywords.filter((k) => words.has(k)).length;
    if (score > bestScore) [best, bestScore] = [entry, score];
  }
  return best;
}

export function formatDate(ms) {
  return new Date(ms).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" });
}
