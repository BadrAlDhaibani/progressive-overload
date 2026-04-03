import type { LastPerformanceSet } from '@/db/workouts';

export function formatLastPerformance(sets: LastPerformanceSet[]): string {
  if (sets.length === 0) return 'Last: --';
  return sets.length === 1 ? 'Last: 1 set' : `Last: ${sets.length} sets`;
}
