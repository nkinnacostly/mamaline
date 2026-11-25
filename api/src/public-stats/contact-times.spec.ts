import { contactSummary } from './contact-times.js';

const at = (minute: number) => new Date(Date.UTC(2026, 10, 25, 9, minute));

describe('danger-sign contact times', () => {
  it('reports nothing until a health worker marks an alert contacted', () => {
    expect(contactSummary([])).toEqual({ contacted: 0, contactedWithinOneHour: 0, medianMinutesToContact: null });
    expect(contactSummary([{ createdAt: at(0), contactedAt: null }])).toEqual({
      contacted: 0,
      contactedWithinOneHour: 0,
      medianMinutesToContact: null,
    });
  });

  it('counts contacts within an hour, including exactly 60 minutes', () => {
    const summary = contactSummary([
      { createdAt: at(0), contactedAt: at(20) },
      { createdAt: at(0), contactedAt: at(60) },
      { createdAt: at(0), contactedAt: new Date(at(0).getTime() + 90 * 60_000) },
      { createdAt: at(0), contactedAt: null },
    ]);
    expect(summary.contacted).toBe(3);
    expect(summary.contactedWithinOneHour).toBe(2);
    expect(summary.medianMinutesToContact).toBe(60);
  });

  it('takes the middle of an even count and rounds to whole minutes', () => {
    const summary = contactSummary([
      { createdAt: at(0), contactedAt: at(10) },
      { createdAt: at(0), contactedAt: at(25) },
    ]);
    expect(summary.medianMinutesToContact).toBe(18); // 17.5 rounds up
  });

  it('treats a contact stamped before the report (clock skew) as immediate', () => {
    expect(contactSummary([{ createdAt: at(30), contactedAt: at(29) }]).medianMinutesToContact).toBe(0);
  });
});
