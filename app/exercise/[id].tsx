import { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SectionList,
  Pressable,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useColors, type Colors } from '@/constants/colors';
import { useMuscleGroupColors } from '@/constants/muscleGroupColors';
import { cardShadow } from '@/constants/shadows';
import type { MuscleGroup } from '@/constants/muscleGroups';
import { fonts } from '@/constants/typography';
import AnimatedScreen from '@/components/AnimatedScreen';
import { getExerciseById } from '@/db/exercises';
import { getExerciseHistory, type ExerciseHistoryRow } from '@/db/workouts';

type ProgressionDirection = 'up' | 'down' | 'flat' | null;

interface SessionSummary {
  workoutId: number;
  startedAt: string;
  sets: ExerciseHistoryRow[];
  totalVolume: number;
  totalReps: number;
  isBodyweight: boolean;
  progression: ProgressionDirection;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'Z');
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function groupSessions(rows: ExerciseHistoryRow[]): Omit<SessionSummary, 'progression'>[] {
  const map = new Map<number, Omit<SessionSummary, 'progression'>>();
  const order: number[] = [];
  for (const r of rows) {
    let group = map.get(r.workout_id);
    if (!group) {
      group = {
        workoutId: r.workout_id,
        startedAt: r.started_at,
        sets: [],
        totalVolume: 0,
        totalReps: 0,
        isBodyweight: true,
      };
      map.set(r.workout_id, group);
      order.push(r.workout_id);
    }
    group.sets.push(r);
    group.totalVolume += (r.weight ?? 0) * (r.reps ?? 0);
    group.totalReps += r.reps ?? 0;
    if (r.weight != null) group.isBodyweight = false;
  }
  return order.map((id) => map.get(id)!);
}

function computeProgression(
  sessions: Omit<SessionSummary, 'progression'>[],
  isAssisted: boolean
): SessionSummary[] {
  return sessions.map((s, i) => {
    const older = sessions[i + 1];
    if (!older) return { ...s, progression: null };

    const bothBodyweight = s.isBodyweight && older.isBodyweight;
    const curr = bothBodyweight ? s.totalReps : s.totalVolume;
    const prev = bothBodyweight ? older.totalReps : older.totalVolume;

    let direction: ProgressionDirection;
    if (curr === prev) direction = 'flat';
    else if (isAssisted && !bothBodyweight) direction = curr < prev ? 'up' : 'down';
    else direction = curr > prev ? 'up' : 'down';

    return { ...s, progression: direction };
  });
}

function formatSet(
  set: ExerciseHistoryRow,
  isAssisted: boolean
): string {
  const reps = set.reps ?? 0;
  if (set.weight == null) return `BW × ${reps}`;
  if (isAssisted) return `${set.weight} lbs (assisted) × ${reps}`;
  return `${set.weight} lbs × ${reps}`;
}

function findBestSet(
  sessions: SessionSummary[],
  isAssisted: boolean
): ExerciseHistoryRow | null {
  let best: ExerciseHistoryRow | null = null;
  const allBodyweight = sessions.every((s) => s.isBodyweight);

  for (const session of sessions) {
    for (const set of session.sets) {
      if (!best) {
        best = set;
        continue;
      }
      if (allBodyweight) {
        if ((set.reps ?? 0) > (best.reps ?? 0)) best = set;
      } else if (isAssisted) {
        const currReps = set.reps ?? 0;
        const bestReps = best.reps ?? 0;
        if (currReps > bestReps) best = set;
        else if (currReps === bestReps && (set.weight ?? Infinity) < (best.weight ?? Infinity)) best = set;
      } else {
        const currVol = (set.weight ?? 0) * (set.reps ?? 0);
        const bestVol = (best.weight ?? 0) * (best.reps ?? 0);
        if (currVol > bestVol) best = set;
      }
    }
  }
  return best;
}

export default function ExerciseHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const mgColors = useMuscleGroupColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const exerciseId = Number(id);
  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((k) => k + 1);
    }, [])
  );

  const exercise = useMemo(
    () => (Number.isFinite(exerciseId) ? getExerciseById(exerciseId) : null),
    [exerciseId, refreshKey]
  );
  const history = useMemo(
    () => (Number.isFinite(exerciseId) ? getExerciseHistory(exerciseId) : []),
    [exerciseId, refreshKey]
  );

  const isAssisted = !!exercise?.is_assisted;

  const sessions = useMemo(() => {
    const grouped = groupSessions(history);
    return computeProgression(grouped, isAssisted);
  }, [history, isAssisted]);

  const bestSet = useMemo(
    () => findBestSet(sessions, isAssisted),
    [sessions, isAssisted]
  );

  const allBodyweight = sessions.length > 0 && sessions.every((s) => s.isBodyweight);
  const totalVolumeAllTime = sessions.reduce((sum, s) => sum + s.totalVolume, 0);
  const totalRepsAllTime = sessions.reduce((sum, s) => sum + s.totalReps, 0);

  const sectionListData = useMemo(
    () =>
      sessions.map((s, i) => ({
        title: s.startedAt,
        totalVolume: s.totalVolume,
        totalReps: s.totalReps,
        isBodyweight: s.isBodyweight,
        progression: s.progression,
        isFirst: i === 0,
        data: s.sets,
      })),
    [sessions]
  );

  if (!exercise) {
    return (
      <SafeAreaProvider>
        <AnimatedScreen>
          <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <Header title="Exercise" colors={colors} styles={styles} />
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Exercise not found</Text>
            </View>
          </SafeAreaView>
        </AnimatedScreen>
      </SafeAreaProvider>
    );
  }

  const badge = mgColors[exercise.muscle_group as MuscleGroup] ?? {
    bg: colors.primaryLight,
    text: colors.primary,
  };

  return (
    <SafeAreaProvider>
      <AnimatedScreen>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <Header title={exercise.name} colors={colors} styles={styles} />

          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>
                {exercise.muscle_group}
              </Text>
            </View>
            <Text style={styles.equipment}>
              {exercise.equipment}
              {isAssisted ? ' · assisted' : ''}
            </Text>
          </View>

          {sessions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No history yet</Text>
              <Text style={styles.emptySubtitle}>
                Complete a workout with this exercise to see your progress.
              </Text>
            </View>
          ) : (
            <SectionList
              sections={sectionListData}
              keyExtractor={(item, i) => `${item.workout_id}-${item.set_order}-${i}`}
              stickySectionHeadersEnabled={false}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                <StatsRow
                  sessions={sessions.length}
                  bestSet={bestSet}
                  allBodyweight={allBodyweight}
                  totalVolumeAllTime={totalVolumeAllTime}
                  totalRepsAllTime={totalRepsAllTime}
                  lastSessionAt={sessions[0]?.startedAt}
                  styles={styles}
                />
              }
              renderSectionHeader={({ section }) => (
                <SessionHeader
                  startedAt={section.title}
                  totalVolume={section.totalVolume}
                  totalReps={section.totalReps}
                  isBodyweight={section.isBodyweight}
                  progression={section.progression}
                  isFirst={section.isFirst}
                  colors={colors}
                  styles={styles}
                />
              )}
              renderItem={({ item }) => (
                <View style={styles.setRow}>
                  <Text style={styles.setNumber}>Set {item.set_order}</Text>
                  <Text style={styles.setValue}>{formatSet(item, isAssisted)}</Text>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </AnimatedScreen>
    </SafeAreaProvider>
  );
}

function Header({
  title,
  colors,
  styles,
}: {
  title: string;
  colors: Colors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={8}
        style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
      >
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.backButton} />
    </View>
  );
}

function StatsRow({
  sessions,
  bestSet,
  allBodyweight,
  totalVolumeAllTime,
  totalRepsAllTime,
  lastSessionAt,
  styles,
}: {
  sessions: number;
  bestSet: ExerciseHistoryRow | null;
  allBodyweight: boolean;
  totalVolumeAllTime: number;
  totalRepsAllTime: number;
  lastSessionAt: string | undefined;
  styles: ReturnType<typeof createStyles>;
}) {
  const bestLabel = bestSet
    ? allBodyweight || bestSet.weight == null
      ? `BW × ${bestSet.reps ?? 0}`
      : `${bestSet.weight} lbs × ${bestSet.reps ?? 0}`
    : '—';

  const totalLabel = allBodyweight
    ? totalRepsAllTime.toLocaleString()
    : totalVolumeAllTime.toLocaleString();
  const totalSuffix = allBodyweight ? 'Total Reps' : 'Total Volume';

  return (
    <View style={styles.statsRow}>
      <View style={styles.statBox}>
        <Text style={styles.statValue}>{sessions}</Text>
        <Text style={styles.statLabel}>Sessions</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statValue}>{bestLabel}</Text>
        <Text style={styles.statLabel}>Best Set</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statValue}>{totalLabel}</Text>
        <Text style={styles.statLabel}>{totalSuffix}</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statValue}>
          {lastSessionAt ? formatDate(lastSessionAt) : '—'}
        </Text>
        <Text style={styles.statLabel}>Last Session</Text>
      </View>
    </View>
  );
}

function SessionHeader({
  startedAt,
  totalVolume,
  totalReps,
  isBodyweight,
  progression,
  isFirst,
  colors,
  styles,
}: {
  startedAt: string;
  totalVolume: number;
  totalReps: number;
  isBodyweight: boolean;
  progression: ProgressionDirection;
  isFirst: boolean;
  colors: Colors;
  styles: ReturnType<typeof createStyles>;
}) {
  const volumeLabel = isBodyweight
    ? `${totalReps} reps`
    : `${totalVolume.toLocaleString()} lb·reps`;

  let arrowIcon: 'arrow-up' | 'arrow-down' | 'remove' | null = null;
  let arrowColor: string = colors.textMuted;
  if (progression === 'up') {
    arrowIcon = 'arrow-up';
    arrowColor = colors.success;
  } else if (progression === 'down') {
    arrowIcon = 'arrow-down';
    arrowColor = colors.error;
  } else if (progression === 'flat') {
    arrowIcon = 'remove';
    arrowColor = colors.textMuted;
  }

  return (
    <View style={[styles.sessionHeader, !isFirst && styles.sessionHeaderGap]}>
      <View style={styles.sessionHeaderText}>
        <Text style={styles.sessionDate}>{formatDate(startedAt)}</Text>
        <Text style={styles.sessionVolume}>{volumeLabel}</Text>
      </View>
      {arrowIcon && (
        <View style={styles.arrowWrap}>
          <Ionicons name={arrowIcon} size={18} color={arrowColor} />
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 8,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
    },
    backButtonPressed: {
      backgroundColor: colors.bgMuted,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 17,
      fontFamily: fonts.semiBold,
      color: colors.text,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 10,
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
    equipment: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    statsRow: {
      flexDirection: 'row',
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      gap: 8,
      ...cardShadow(colors),
    },
    statBox: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 16,
      fontFamily: fonts.bold,
      color: colors.text,
      marginBottom: 4,
      textAlign: 'center',
    },
    statLabel: {
      fontSize: 11,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    sessionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 4,
    },
    sessionHeaderGap: {
      marginTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.divider,
      paddingTop: 14,
    },
    sessionHeaderText: {
      flex: 1,
    },
    sessionDate: {
      fontSize: 15,
      fontFamily: fonts.semiBold,
      color: colors.text,
    },
    sessionVolume: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginTop: 2,
    },
    arrowWrap: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    setRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    setNumber: {
      fontSize: 13,
      fontFamily: fonts.semiBold,
      color: colors.textMuted,
      width: 56,
    },
    setValue: {
      fontSize: 15,
      fontFamily: fonts.medium,
      color: colors.text,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 17,
      fontFamily: fonts.semiBold,
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 15,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
