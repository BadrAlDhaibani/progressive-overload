import type { LeaderboardMetric, LeaderboardRow } from '@/lib/social/types';

export const METRIC_OPTIONS: { value: LeaderboardMetric; label: string; shortLabel: string }[] = [
  { value: 'workouts', label: 'Workouts', shortLabel: 'Workouts' },
  { value: 'volume', label: 'Volume',  shortLabel: 'Volume' },
  { value: 'duration', label: 'Time',   shortLabel: 'Time' },
];

export function metricValue(row: LeaderboardRow, metric: LeaderboardMetric): number {
  if (metric === 'workouts') return row.workouts_count;
  if (metric === 'volume')   return row.volume_lbs;
  return row.duration_seconds;
}

export function formatMetric(row: LeaderboardRow, metric: LeaderboardMetric): string {
  const v = metricValue(row, metric);
  if (metric === 'workouts') return `${v}`;
  if (metric === 'volume')   return formatVolume(v);
  return formatDuration(v);
}

export function metricUnit(metric: LeaderboardMetric): string {
  if (metric === 'workouts') return 'this week';
  if (metric === 'volume')   return 'lbs · this week';
  return 'this week';
}

function formatVolume(lbs: number): string {
  if (lbs >= 1000) return `${(lbs / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${Math.round(lbs)}`;
}

function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
