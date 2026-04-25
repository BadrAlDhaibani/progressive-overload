import { generateUsername, isValidUsername, normalizeUsername } from '../username';

describe('isValidUsername', () => {
  it.each([
    ['abc', true],
    ['iron_bear_123', true],
    ['a'.repeat(24), true],
  ])('accepts %s', (input, expected) => {
    expect(isValidUsername(input)).toBe(expected);
  });

  it.each([
    ['ab', 'too short (2 chars, min 3)'],
    ['a'.repeat(25), 'too long (25 chars, max 24)'],
    ['', 'empty'],
    ['Iron_Bear', 'uppercase letters'],
    ['iron-bear', 'hyphen'],
    ['iron bear', 'space'],
    ['iron.bear', 'dot'],
    ['iron@bear', 'at sign'],
  ])('rejects %s (%s)', (input) => {
    expect(isValidUsername(input)).toBe(false);
  });
});

describe('normalizeUsername', () => {
  it('lowercases input', () => {
    expect(normalizeUsername('IronBear')).toBe('ironbear');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeUsername('  iron_bear  ')).toBe('iron_bear');
  });

  it('combines trim and lowercase', () => {
    expect(normalizeUsername('  IRON_BEAR\n')).toBe('iron_bear');
  });

  it('preserves underscores and digits', () => {
    expect(normalizeUsername('Iron_Bear_123')).toBe('iron_bear_123');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeUsername('   \t\n')).toBe('');
  });
});

describe('generateUsername', () => {
  it('returns a string in the adjective_noun_NNN shape', () => {
    const u = generateUsername();
    expect(u).toMatch(/^[a-z]+_[a-z]+_\d{3}$/);
  });

  it('always produces a valid username', () => {
    for (let i = 0; i < 50; i++) {
      const u = generateUsername();
      expect(isValidUsername(u)).toBe(true);
    }
  });

  it('produces 3-digit suffixes between 100 and 999', () => {
    for (let i = 0; i < 50; i++) {
      const u = generateUsername();
      const suffix = u.split('_').pop()!;
      const n = parseInt(suffix, 10);
      expect(n).toBeGreaterThanOrEqual(100);
      expect(n).toBeLessThanOrEqual(999);
    }
  });
});
