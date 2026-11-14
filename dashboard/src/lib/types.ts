export type HealthWorker = { id: string; name: string; phone: string; places: string[] };

export type DayCount = { date: string; due: number };
export type Week = { today: string; days: DayCount[] };

export type Alert = { id: string; sign: string; signLabel: string; phone: string; location: string | null; detail: string | null; createdAt: string; motherId: string | null };
export type FollowUp = { id: string; phone: string; reason: string; createdAt: string; motherId: string | null };
export type Visit = { motherId: string; itemKey: string; phone: string; location: string; kind: "anc" | "vaccine"; title: string; detail: string; due: string; status: "done" | "due" | "missed" | "upcoming" };
export type Day = { date: string; isToday: boolean; alerts: Alert[]; followUps: FollowUp[]; visits: Visit[] };

export type Mother = {
  id: string;
  phone: string;
  location: string;
  language: "en" | "pcm" | "ha" | "yo" | "ig";
  track: "PREGNANCY" | "BABY";
  week: number;
  consentStatus: "PENDING" | "GIVEN";
  registeredAt: string;
  next: { title: string; due: string; overdue: boolean } | null;
};
