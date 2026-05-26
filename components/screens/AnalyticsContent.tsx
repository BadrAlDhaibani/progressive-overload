import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';

import { useColors, type Colors } from '@/constants/colors';
import { useMuscleGroupColors } from '@/constants/muscleGroupColors';
import type { MuscleGroup } from '@/constants/muscleGroups';
import { TAB_BAR_SCROLL_PADDING } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import AnimatedScreen from '@/components/AnimatedScreen';
import AnimatedPressable from '@/components/AnimatedPressable';
import SegmentedControl from '@/components/SegmentedControl';
import Sparkline from '@/components/analytics/Sparkline';
import { getRecentExerciseSets, type ExerciseTrendRow } from '@/db/workouts';
import {
  computeWindowedTrend,
  sessionBestScore,
  setScore,
  type ProgressionDirection,
} from '@/lib/progression';

const WINDOW_DAYS = 30;

type Filter = 'all' | 'up' | 'flat' | 'down';

interface ExerciseTrend {
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string;
  isAssisted: boolean;
  topSet: { weight: number | null; reps: number | null } | null;
  sparklinePoints: number[];
  trend: ProgressionDirection;
  latestStartedAt: string;
}

function buildTrends(rows: ExerciseTrendRow[]): ExerciseTrend[] {
  // Rows arrive sorted by exercise_id ASC, started_at DESC, set_order ASC.
  const byExercise = new Map<number, ExerciseTrendRow[]>();
  for (const r of rows) {
    const bucket = byExercise.get(r.exercise_id);
    if (bucket) bucket.push(r);
    else byExercise.set(r.exercise_id, [r]);
  }

  const result: ExerciseTrend[] = [];
  for (const [exerciseId, exRows] of byExercise) {
    const sessions: { startedAt: string; sets: ExerciseTrendRow[] }[] = [];
    const seen = new Map<number, number>();
    for (const r of exRows) {
      let idx = seen.get(r.workout_id);
      if (idx === undefined) {
        idx = sessions.length;
        seen.set(r.workout_id, idx);
        sessions.push({ startedAt: r.started_at, sets: [] });
      }
      sessions[idx].sets.push(r);
    }

    const isAssisted = exRows[0].is_assisted === 1;
    const sessionScores = sessions.map((s) => ({
      startedAt: s.startedAt,
      bestScore: sessionBestScore(s.sets, isAssisted),
    }));
    const trend = computeWindowedTrend(sessionScores);

    const latest = sessions[0];
    let topSet: { weight: number | null; reps: number | null } | null = null;
    let topScore: number | null = null;
    for (const s of latest.sets) {
      const score = setScore(s, isAssisted);
      if (score == null) continue;
      if (topScore == null || score > topScore) {
        topScore = score;
        topSet = { weight: s.weight, reps: s.reps };
      }
    }

    const sparklinePoints = sessionScores
      .map((s) => s.bestScore)
      .filter((x): x is number => x != null)
      .reverse();

    result.push({
      exerciseId,
      exerciseName: exRows[0].exercise_name,
      muscleGroup: exRows[0].muscle_group,
      isAssisted,
      topSet,
      sparklinePoints,
      trend,
      latestStartedAt: latest.startedAt,
    });
  }
  return result;
}

function formatTopSet(
  set: { weight: number | null; reps: number | null } | null,
  isAssisted: boolean
): string {
  if (!set || set.reps == null) return '—';
  if (set.weight == null) return `BW × ${set.reps}`;
  if (isAssisted) return `${set.weight} lbs (assisted) × ${set.reps}`;
  return `${set.weight} lbs × ${set.reps}`;
}

const TREND_RANK: Record<'down' | 'flat' | 'up' | 'null', number> = {
  down: 0,
  flat: 1,
  up: 2,
  null: 3,
};

function trendKey(t: ProgressionDirection): keyof typeof TREND_RANK {
  return t ?? 'null';
}

export default function AnalyticsContent() {
  const colors = useColors();
  const mgColors = useMuscleGroupColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const [trends, setTrends] = useState<ExerciseTrend[]>([]);
  const [filter, setFilter] = useState<Filter>('all');

  const loadData = useCallback(() => {
    const rows = getRecentExerciseSets(WINDOW_DAYS);
    setTrends(buildTrends(rows));
  }, []);

  useFocusEffect(loadData);

  const counts = useMemo(() => {
    const c = { all: trends.length, up: 0, flat: 0, down: 0 };
    for (const t of trends) {
      if (t.trend === 'up') c.up++;
      else if (t.trend === 'flat') c.flat++;
      else if (t.trend === 'down') c.down++;
    }
    return c;
  }, [trends]);

  const visible = useMemo(() => {
    const filtered =
      filter === 'all' ? trends : trends.filter((t) => t.trend === filter);
    return [...filtered].sort((a, b) => {
      if (filter === 'all') {
        const rankA = TREND_RANK[trendKey(a.trend)];
        const rankB = TREND_RANK[trendKey(b.trend)];
        if (rankA !== rankB) return rankA - rankB;
      }
      return b.latestStartedAt.localeCompare(a.latestStartedAt);
    });
  }, [trends, filter]);

  const handleRowPress = useCallback(
    (exerciseId: number) => {
      router.push(`/exercise/${exerciseId}`);
    },
    [router]
  );

  const filterOptions = useMemo(
    () => [
      { value: 'all' as const, label: `All ${counts.all}` },
      { value: 'up' as const, label: `↑ ${counts.up}` },
      { value: 'flat' as const, label: `– ${counts.flat}` },
      { value: 'down' as const, label: `↓ ${counts.down}` },
    ],
    [counts]
  );

  return (
    <AnimatedScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
        </View>

        {trends.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No progression data yet</Text>
            <Text style={styles.hintText}>
              Train an exercise twice in the last 30 days to see progression.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={loadData}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          >
            <View style={styles.filterWrap}>
              <SegmentedControl<Filter>
                options={filterOptions}
                value={filter}
                onChange={setFilter}
              />
            </View>

            {visible.length === 0 ? (
              <View style={styles.filterEmpty}>
                <Text style={styles.hintText}>
                  No exercises in this category.
                </Text>
              </View>
            ) : (
              visible.map((t) => {
                const badge =
                  mgColors[t.muscleGroup as MuscleGroup] ?? {
                    bg: colors.primaryLight,
                    text: colors.primary,
                  };
                const trendColor =
                  t.trend === 'up'
                    ? colors.success
                    : t.trend === 'down'
                      ? colors.error
                      : colors.textMuted;
                const trendIcon: 'arrow-up' | 'arrow-down' | 'remove' | null =
                  t.trend === 'up'
                    ? 'arrow-up'
                    : t.trend === 'down'
                      ? 'arrow-down'
                      : t.trend === 'flat'
                        ? 'remove'
                        : null;

                return (
                  <AnimatedPressable
                    key={t.exerciseId}
                    onPress={() => handleRowPress(t.exerciseId)}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <View style={styles.rowLeft}>
                      <Text style={styles.exerciseName} numberOfLines={1}>
                        {t.exerciseName}
                      </Text>
                      <Text style={styles.topSet} numberOfLines={1}>
                        {formatTopSet(t.topSet, t.isAssisted)}
                      </Text>
                    </View>
                    <View style={styles.rowRight}>
                      <View
                        style={[styles.badge, { backgroundColor: badge.bg }]}
                      >
                        <Text
                          style={[styles.badgeText, { color: badge.text }]}
                        >
                          {t.muscleGroup}
                        </Text>
                      </View>
                      <View style={styles.trendRow}>
                        <Sparkline
                          points={t.sparklinePoints}
                          color={trendColor}
                        />
                        {trendIcon ? (
                          <Ionicons
                            name={trendIcon}
                            size={18}
                            color={trendColor}
                          />
                        ) : (
                          <Text style={[styles.trendDash, { color: trendColor }]}>
                            —
                          </Text>
                        )}
                      </View>
                    </View>
                  </AnimatedPressable>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </AnimatedScreen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    title: {
      fontSize: 28,
      fontFamily: fonts.bold,
      color: colors.text,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: TAB_BAR_SCROLL_PADDING,
    },
    filterWrap: {
      marginTop: 4,
      marginBottom: 16,
    },
    filterEmpty: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
    },
    rowPressed: {
      backgroundColor: colors.bgMuted,
    },
    rowLeft: {
      flex: 1,
      marginRight: 12,
    },
    exerciseName: {
      fontSize: 15,
      fontFamily: fonts.semiBold,
      color: colors.text,
      marginBottom: 4,
    },
    topSet: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    rowRight: {
      alignItems: 'flex-end',
      gap: 8,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    badgeText: {
      fontSize: 12,
      fontFamily: fonts.semiBold,
    },
    trendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    trendDash: {
      fontSize: 16,
      fontFamily: fonts.semiBold,
      width: 18,
      textAlign: 'center',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bg,
      paddingHorizontal: 32,
    },
    emptyText: {
      fontSize: 17,
      fontFamily: fonts.semiBold,
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    hintText: {
      fontSize: 15,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
