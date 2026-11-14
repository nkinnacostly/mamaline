import { addDays, dayKey, dayStart, weekStart } from './days.js';

describe('Nigerian calendar days', () => {
  it('uses West Africa Time (UTC+1)', () => {
    expect(dayKey(Date.UTC(2026, 10, 14, 22, 59))).toBe('2026-11-14');
    expect(dayKey(Date.UTC(2026, 10, 14, 23, 0))).toBe('2026-11-15');
    expect(new Date(dayStart('2026-11-15')).toISOString()).toBe('2026-11-14T23:00:00.000Z');
  });

  it('moves between days and finds the Sunday that starts the week', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
    expect(weekStart('2026-11-14')).toBe('2026-11-08'); // a Saturday
    expect(weekStart('2026-11-08')).toBe('2026-11-08'); // already Sunday
  });
});
