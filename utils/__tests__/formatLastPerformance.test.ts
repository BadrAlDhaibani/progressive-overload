import { formatLastPerformance } from '../formatLastPerformance';

describe('formatLastPerformance', () => {
  it('returns the empty placeholder when no sets', () => {
    expect(formatLastPerformance([])).toBe('Last: --');
  });

  it('uses singular for one set', () => {
    expect(formatLastPerformance([{ set_order: 1, weight: 135, reps: 10 }])).toBe(
      'Last: 1 set'
    );
  });

  it('uses plural for two or more sets', () => {
    const sets = [
      { set_order: 1, weight: 135, reps: 10 },
      { set_order: 2, weight: 145, reps: 8 },
    ];
    expect(formatLastPerformance(sets)).toBe('Last: 2 sets');
  });

  it('counts sets by length, not by content', () => {
    const sets = [
      { set_order: 1, weight: null, reps: null },
      { set_order: 2, weight: 0, reps: 0 },
      { set_order: 3, weight: 200, reps: 5 },
    ];
    expect(formatLastPerformance(sets)).toBe('Last: 3 sets');
  });
});
