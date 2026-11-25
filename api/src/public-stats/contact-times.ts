export type AlertTimes = { createdAt: Date; contactedAt: Date | null };

export type ContactSummary = {
  /** Danger-sign reports the health worker has marked as contacted. */
  contacted: number;
  /** Of those, contacted within an hour of the report (PRD section 15). */
  contactedWithinOneHour: number;
  /** Median minutes from report to contact, rounded; null until one is contacted. */
  medianMinutesToContact: number | null;
};

const HOUR_MINUTES = 60;

/** How quickly health workers reach mothers who report a danger sign. */
export function contactSummary(alerts: AlertTimes[]): ContactSummary {
  const minutes = alerts
    .filter((a): a is { createdAt: Date; contactedAt: Date } => a.contactedAt !== null)
    .map((a) => Math.max(0, (a.contactedAt.getTime() - a.createdAt.getTime()) / 60_000))
    .sort((a, b) => a - b);

  const n = minutes.length;
  const median = n === 0 ? null : n % 2 === 1 ? minutes[(n - 1) / 2] : (minutes[n / 2 - 1] + minutes[n / 2]) / 2;

  return {
    contacted: n,
    contactedWithinOneHour: minutes.filter((m) => m <= HOUR_MINUTES).length,
    medianMinutesToContact: median === null ? null : Math.round(median),
  };
}
