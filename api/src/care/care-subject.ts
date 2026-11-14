import type { CareSubject } from '../content/schedule.js';
import type { CareRecord, Mother, SentReminder } from '../generated/prisma/client.js';

/** The scheduler's view of a mother: her dates, what she has done, and what has been sent. */
export function toCareSubject(mother: Mother & { careRecords: CareRecord[]; sentReminders: SentReminder[] }): CareSubject {
  return {
    track: mother.track,
    expectedDueDate: mother.expectedDueDate,
    babyBirthDate: mother.babyBirthDate,
    trackStartedAt: mother.trackStartedAt,
    done: new Set(mother.careRecords.map((r) => r.itemKey)),
    sent: new Set(mother.sentReminders.map((r) => r.key)),
  };
}
