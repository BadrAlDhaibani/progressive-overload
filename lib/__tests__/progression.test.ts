import {
  setScore,
  sessionBestScore,
  computeSessionTrend,
  computeWindowedTrend,
} from '../progression';

describe('setScore', () => {
  it('returns Epley e1RM for weighted sets', () => {
    expect(setScore({ weight: 100, reps: 5 }, false)).toBeCloseTo(100 * (1 + 5 / 30));
    expect(setScore({ weight: 225, reps: 1 }, false)).toBeCloseTo(225 * (1 + 1 / 30));
  });

  it('returns reps for bodyweight sets', () => {
    expect(setScore({ weight: null, reps: 10 }, false)).toBe(10);
  });

  it('returns negative e1RM for assisted weighted sets', () => {
    const score = setScore({ weight: 40, reps: 8 }, true);
    expect(score).toBeLessThan(0);
    expect(score).toBeCloseTo(-(40 * (1 + 8 / 30)));
  });

  it('returns reps for assisted bodyweight sets', () => {
    expect(setScore({ weight: null, reps: 8 }, true)).toBe(8);
  });

  it('returns null when reps is null or zero', () => {
    expect(setScore({ weight: 100, reps: null }, false)).toBeNull();
    expect(setScore({ weight: 100, reps: 0 }, false)).toBeNull();
    expect(setScore({ weight: null, reps: 0 }, true)).toBeNull();
  });
});

describe('sessionBestScore', () => {
  it('returns the max score across sets', () => {
    const sets = [
      { weight: 100, reps: 5 },
      { weight: 110, reps: 5 },
      { weight: 105, reps: 3 },
    ];
    expect(sessionBestScore(sets, false)).toBeCloseTo(110 * (1 + 5 / 30));
  });

  it('returns the least-assist set for assisted (max of negative scores)', () => {
    const sets = [
      { weight: 40, reps: 8 },
      { weight: 25, reps: 8 },
    ];
    expect(sessionBestScore(sets, true)).toBeCloseTo(-(25 * (1 + 8 / 30)));
  });

  it('returns null for empty input', () => {
    expect(sessionBestScore([], false)).toBeNull();
  });

  it('returns null when every set has null/zero reps', () => {
    expect(
      sessionBestScore(
        [
          { weight: 100, reps: null },
          { weight: 100, reps: 0 },
        ],
        false
      )
    ).toBeNull();
  });
});

describe('computeSessionTrend', () => {
  it('returns flat when totals are equal', () => {
    expect(computeSessionTrend(1000, 1000, false)).toBe('flat');
    expect(computeSessionTrend(0, 0, true)).toBe('flat');
  });

  it('returns up when curr > prev for non-assisted', () => {
    expect(computeSessionTrend(1100, 1000, false)).toBe('up');
  });

  it('returns down when curr < prev for non-assisted', () => {
    expect(computeSessionTrend(900, 1000, false)).toBe('down');
  });

  it('inverts comparison for assisted-non-bodyweight: less assist = up', () => {
    expect(computeSessionTrend(900, 1000, true)).toBe('up');
    expect(computeSessionTrend(1100, 1000, true)).toBe('down');
  });
});

describe('computeWindowedTrend', () => {
  const now = new Date('2026-05-18T12:00:00Z');
  const daysAgo = (d: number) =>
    new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

  it('returns up when recent best > prior best by more than tolerance', () => {
    const sessions = [
      { startedAt: daysAgo(3), bestScore: 220 },
      { startedAt: daysAgo(20), bestScore: 200 },
    ];
    expect(computeWindowedTrend(sessions, now)).toBe('up');
  });

  it('returns down when recent best < prior best by more than tolerance', () => {
    const sessions = [
      { startedAt: daysAgo(3), bestScore: 180 },
      { startedAt: daysAgo(20), bestScore: 200 },
    ];
    expect(computeWindowedTrend(sessions, now)).toBe('down');
  });

  it('returns flat when |delta| < 2.5%', () => {
    const sessions = [
      { startedAt: daysAgo(3), bestScore: 200.5 },
      { startedAt: daysAgo(20), bestScore: 200 },
    ];
    expect(computeWindowedTrend(sessions, now)).toBe('flat');
  });

  it('returns up when delta just exceeds 2.5%', () => {
    const sessions = [
      { startedAt: daysAgo(3), bestScore: 206 },
      { startedAt: daysAgo(20), bestScore: 200 },
    ];
    expect(computeWindowedTrend(sessions, now)).toBe('up');
  });

  it('returns null when recent window is empty', () => {
    const sessions = [{ startedAt: daysAgo(20), bestScore: 200 }];
    expect(computeWindowedTrend(sessions, now)).toBeNull();
  });

  it('returns null when prior window is empty', () => {
    const sessions = [{ startedAt: daysAgo(3), bestScore: 200 }];
    expect(computeWindowedTrend(sessions, now)).toBeNull();
  });

  it('ignores sessions outside the 28-day window', () => {
    const sessions = [
      { startedAt: daysAgo(3), bestScore: 220 },
      { startedAt: daysAgo(40), bestScore: 999 },
    ];
    expect(computeWindowedTrend(sessions, now)).toBeNull();
  });

  it('skips sessions with null bestScore', () => {
    const sessions = [
      { startedAt: daysAgo(3), bestScore: null },
      { startedAt: daysAgo(20), bestScore: 200 },
    ];
    expect(computeWindowedTrend(sessions, now)).toBeNull();
  });
});
