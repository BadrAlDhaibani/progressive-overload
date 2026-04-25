import { isoWeekStart } from '../week';

describe('isoWeekStart', () => {
  it('returns the Monday of the same week for a Wednesday', () => {
    expect(isoWeekStart(new Date('2026-04-22T14:30:00Z'))).toBe('2026-04-20');
  });

  it('returns the same date when given a Monday', () => {
    expect(isoWeekStart(new Date('2026-04-20T00:00:00Z'))).toBe('2026-04-20');
  });

  it('returns the previous Monday for a Sunday (ISO weeks end on Sunday)', () => {
    expect(isoWeekStart(new Date('2026-04-26T23:59:00Z'))).toBe('2026-04-20');
  });

  it('returns the previous Monday for a Saturday', () => {
    expect(isoWeekStart(new Date('2026-04-25T12:00:00Z'))).toBe('2026-04-20');
  });

  it('crosses month boundaries correctly', () => {
    expect(isoWeekStart(new Date('2026-05-02T12:00:00Z'))).toBe('2026-04-27');
  });

  it('crosses year boundaries correctly', () => {
    expect(isoWeekStart(new Date('2026-01-01T12:00:00Z'))).toBe('2025-12-29');
  });

  it('uses UTC, not local time, for the day-of-week calculation', () => {
    const lateMondayUtc = new Date('2026-04-20T23:30:00Z');
    expect(isoWeekStart(lateMondayUtc)).toBe('2026-04-20');
  });

  it('returns a Monday for any 14 consecutive days', () => {
    const start = new Date('2026-04-13T12:00:00Z');
    const seenMondays = new Set<string>();
    for (let i = 0; i < 14; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const monday = isoWeekStart(d);
      seenMondays.add(monday);
      const dow = new Date(`${monday}T00:00:00Z`).getUTCDay();
      expect(dow).toBe(1);
    }
    expect(seenMondays.size).toBe(2);
  });
});
