const ADJECTIVES = [
  'iron', 'mighty', 'brave', 'swift', 'steady', 'gritty', 'bold',
  'rugged', 'nimble', 'fierce', 'stout', 'steel', 'chalked', 'loaded',
];

const NOUNS = [
  'bear', 'raccoon', 'wolf', 'bison', 'falcon', 'rhino', 'otter',
  'panther', 'lynx', 'badger', 'stag', 'gorilla', 'hawk', 'hippo',
];

export function generateUsername(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const digits = 100 + Math.floor(Math.random() * 900);
  return `${a}_${n}_${digits}`;
}

export function isValidUsername(u: string): boolean {
  return /^[a-z0-9_]{3,24}$/.test(u);
}

export function normalizeUsername(u: string): string {
  return u.trim().toLowerCase();
}
