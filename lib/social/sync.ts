import { db } from '@/db/database';
import { isSupabaseConfigured } from '@/lib/supabase';
import { upsertWeeklyStats } from './leaderboard';
import { useAuthStore } from '@/store/useAuthStore';
import { isoWeekStart } from './week';

interface WeeklyAggregate {
  workouts_count: number;
  volume_lbs: number;
  duration_seconds: number;
}

function computeWeeklyAggregate(weekStart: string): WeeklyAggregate {
  const startISO = `${weekStart} 00:00:00`;
  const workoutsRow = db.getFirstSync<{
    workouts_count: number;
    duration_seconds: number;
  }>(
    `SELECT COUNT(*) AS workouts_count,
            COALESCE(SUM(CAST((julianday(finished_at) - julianday(started_at)) * 86400 AS INTEGER)), 0) AS duration_seconds
       FROM workouts
      WHERE finished_at IS NOT NULL
        AND started_at >= ?`,
    startISO
  );

  const volumeRow = db.getFirstSync<{ volume_lbs: number | null }>(
    `SELECT COALESCE(SUM(s.weight * s.reps), 0) AS volume_lbs
       FROM sets s
       JOIN workouts w ON w.id = s.workout_id
      WHERE s.is_complete = 1
        AND s.weight IS NOT NULL
        AND s.reps IS NOT NULL
        AND w.finished_at IS NOT NULL
        AND w.started_at >= ?`,
    startISO
  );

  return {
    workouts_count: workoutsRow?.workouts_count ?? 0,
    duration_seconds: workoutsRow?.duration_seconds ?? 0,
    volume_lbs: volumeRow?.volume_lbs ?? 0,
  };
}

export async function syncWeeklyStats(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const userId = useAuthStore.getState().userId;
  if (!userId) return;
  const aggregate = computeWeeklyAggregate(isoWeekStart());
  try {
    await upsertWeeklyStats(userId, aggregate);
  } catch {
    // swallow — leaderboard is not critical to core workout flow
  }
}
