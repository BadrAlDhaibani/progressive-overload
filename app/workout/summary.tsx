import { useCallback, useEffect, useMemo } from 'react';
import { BackHandler, StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useColors, type Colors } from '@/constants/colors';
import { getWorkoutById, getWorkoutSets } from '@/db/workouts';
import type { WorkoutSetWithExercise } from '@/db/workouts';

function formatDuration(startedAt: string, finishedAt: string): string {
  const start = new Date(startedAt + 'Z').getTime();
  const end = new Date(finishedAt + 'Z').getTime();
  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}

interface ExerciseGroup {
  exerciseName: string;
  muscleGroup: string;
  sets: WorkoutSetWithExercise[];
}

function groupByExercise(sets: WorkoutSetWithExercise[]): ExerciseGroup[] {
  const map = new Map<number, ExerciseGroup>();
  for (const s of sets) {
    let group = map.get(s.exercise_id);
    if (!group) {
      group = {
        exerciseName: s.exercise_name,
        muscleGroup: s.muscle_group,
        sets: [],
      };
      map.set(s.exercise_id, group);
    }
    group.sets.push(s);
  }
  return Array.from(map.values());
}

export default function SummaryScreen() {
  const { workoutId, from } = useLocalSearchParams<{ workoutId: string; from?: string }>();
  const isFromHistory = from === 'history';
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const goBack = useCallback(() => {
    if (isFromHistory) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [isFromHistory]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [goBack]);

  const workout = useMemo(
    () => (workoutId ? getWorkoutById(Number(workoutId)) : null),
    [workoutId]
  );
  const allSets = useMemo(
    () => (workoutId ? getWorkoutSets(Number(workoutId)) : []),
    [workoutId]
  );
  const completedSets = useMemo(
    () => allSets.filter((s) => s.is_complete),
    [allSets]
  );
  const exerciseGroups = useMemo(
    () => groupByExercise(completedSets),
    [completedSets]
  );
  const totalVolume = useMemo(
    () =>
      completedSets.reduce(
        (sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0),
        0
      ),
    [completedSets]
  );

  const duration =
    workout?.started_at && workout?.finished_at
      ? formatDuration(workout.started_at, workout.finished_at)
      : '--';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.heading}>{isFromHistory ? 'Workout Summary' : 'Workout Complete'}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{duration}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{exerciseGroups.length}</Text>
              <Text style={styles.statLabel}>Exercises</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{completedSets.length}</Text>
              <Text style={styles.statLabel}>Sets</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {totalVolume.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Volume (lbs)</Text>
            </View>
          </View>

          {exerciseGroups.map((group, i) => (
            <View key={i} style={styles.exerciseBlock}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{group.exerciseName}</Text>
                <Text style={styles.muscleGroup}>{group.muscleGroup}</Text>
              </View>
              {group.sets.map((s) => (
                <View key={s.id} style={styles.setRow}>
                  <Text style={styles.setNumber}>{s.set_order}</Text>
                  <Text style={styles.setValue}>
                    {s.weight != null ? `${s.weight} lbs` : 'BW'} ×{' '}
                    {s.reps ?? 0}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          {exerciseGroups.length === 0 && (
            <Text style={styles.emptyText}>No completed sets.</Text>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          <Pressable
            onPress={goBack}
            style={({ pressed }) => [
              styles.doneButton,
              pressed && styles.doneButtonPressed,
            ]}
          >
            <Text style={styles.doneText}>{isFromHistory ? 'Back' : 'Done'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
    },
    heading: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 24,
      marginTop: 8,
    },
    statsRow: {
      flexDirection: 'row',
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      gap: 8,
    },
    statBox: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    exerciseBlock: {
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    exerciseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    exerciseName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    muscleGroup: {
      fontSize: 12,
      color: colors.textMuted,
      textTransform: 'capitalize',
    },
    setRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
    },
    setNumber: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
      width: 28,
    },
    setValue: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    emptyText: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 32,
    },
    bottomBar: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    doneButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    doneButtonPressed: {
      backgroundColor: colors.primaryDark,
    },
    doneText: {
      fontSize: 17,
      fontWeight: '600',
      color: '#ffffff',
    },
  });
