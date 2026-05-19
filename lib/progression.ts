export type ProgressionDirection = 'up' | 'down' | 'flat' | null;

const FLAT_TOLERANCE = 0.025;
const RECENT_WINDOW_DAYS = 14;
const PRIOR_WINDOW_DAYS = 28;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface SetInput {
  weight: number | null;
  reps: number | null;
}

export function setScore(set: SetInput, isAssisted: boolean): number | null {
  const reps = set.reps;
  if (reps == null || reps === 0) return null;

  if (set.weight == null) {
    return reps;
  }

  const e1rm = set.weight * (1 + reps / 30);
  return isAssisted ? -e1rm : e1rm;
}

export function sessionBestScore(
  sets: SetInput[],
  isAssisted: boolean
): number | null {
  let best: number | null = null;
  for (const s of sets) {
    const score = setScore(s, isAssisted);
    if (score == null) continue;
    if (best == null || score > best) best = score;
  }
  return best;
}

export function computeSessionTrend(
  currTotal: number,
  prevTotal: number,
  isAssistedNonBodyweight: boolean
): ProgressionDirection {
  if (currTotal === prevTotal) return 'flat';
  if (isAssistedNonBodyweight) return currTotal < prevTotal ? 'up' : 'down';
  return currTotal > prevTotal ? 'up' : 'down';
}

export function computeWindowedTrend(
  sessions: { startedAt: string; bestScore: number | null }[],
  now: Date = new Date()
): ProgressionDirection {
  const nowMs = now.getTime();
  const recentStart = nowMs - RECENT_WINDOW_DAYS * MS_PER_DAY;
  const priorStart = nowMs - PRIOR_WINDOW_DAYS * MS_PER_DAY;

  let recentBest: number | null = null;
  let priorBest: number | null = null;

  for (const s of sessions) {
    if (s.bestScore == null) continue;
    const t = new Date(s.startedAt).getTime();
    if (Number.isNaN(t)) continue;
    if (t >= recentStart && t <= nowMs) {
      if (recentBest == null || s.bestScore > recentBest) recentBest = s.bestScore;
    } else if (t >= priorStart && t < recentStart) {
      if (priorBest == null || s.bestScore > priorBest) priorBest = s.bestScore;
    }
  }

  if (recentBest == null || priorBest == null) return null;

  const delta = (recentBest - priorBest) / Math.abs(priorBest);
  if (Math.abs(delta) < FLAT_TOLERANCE) return 'flat';
  return delta > 0 ? 'up' : 'down';
}
