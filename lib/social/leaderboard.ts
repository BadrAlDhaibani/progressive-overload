import { supabase } from '@/lib/supabase';
import type { LeaderboardMetric, LeaderboardRow, WeeklyStatsInput } from './types';
import { isoWeekStart } from './week';

const COLUMN_BY_METRIC: Record<LeaderboardMetric, keyof LeaderboardRow> = {
  workouts: 'workouts_count',
  volume: 'volume_lbs',
  duration: 'duration_seconds',
};

export async function fetchLeaderboard(metric: LeaderboardMetric): Promise<LeaderboardRow[]> {
  const column = COLUMN_BY_METRIC[metric];
  const { data, error } = await supabase
    .from('leaderboard_week')
    .select('user_id, username, display_name, avatar_url, profile_color, workouts_count, volume_lbs, duration_seconds')
    .order(column as string, { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}

export async function upsertWeeklyStats(userId: string, stats: WeeklyStatsInput): Promise<void> {
  const week_start = isoWeekStart();
  const { error } = await supabase
    .from('weekly_stats')
    .upsert(
      {
        user_id: userId,
        week_start,
        workouts_count: stats.workouts_count,
        volume_lbs: stats.volume_lbs,
        duration_seconds: stats.duration_seconds,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,week_start' }
    );
  if (error) throw error;
}
