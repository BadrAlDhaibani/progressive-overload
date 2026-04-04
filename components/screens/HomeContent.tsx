import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { useColors, type Colors } from '@/constants/colors';
import { createWorkout, getRecentWorkouts } from '@/db/workouts';
import { getWorkoutSets } from '@/db/workouts';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import type { Workout } from '@/db/workouts';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'Z');
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatDuration(startedAt: string, finishedAt: string): string {
  const start = new Date(startedAt + 'Z').getTime();
  const end = new Date(finishedAt + 'Z').getTime();
  const totalMinutes = Math.max(0, Math.floor((end - start) / 60000));
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

interface RecentWorkout extends Workout {
  setCount: number;
  exerciseCount: number;
}

export default function HomeContent() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);

  useFocusEffect(
    useCallback(() => {
      const workouts = getRecentWorkouts(5);
      const enriched: RecentWorkout[] = workouts.map((w) => {
        const sets = getWorkoutSets(w.id);
        const completedSets = sets.filter((s) => s.is_complete);
        const exerciseIds = new Set(completedSets.map((s) => s.exercise_id));
        return {
          ...w,
          setCount: completedSets.length,
          exerciseCount: exerciseIds.size,
        };
      });
      setRecentWorkouts(enriched);
    }, [])
  );

  const handleStartWorkout = useCallback(() => {
    const id = createWorkout();
    startWorkout(id);
    router.push(`/workout/${id}`);
  }, [startWorkout, router]);

  const handleWorkoutPress = useCallback(
    (workoutId: number) => {
      router.push(`/workout/summary?workoutId=${workoutId}`);
    },
    [router]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Proverload</Text>
        <Text style={styles.subtitle}>
          Track your progress. Beat your last set.
        </Text>
      </View>

      <Pressable
        onPress={handleStartWorkout}
        style={({ pressed }) => [
          styles.startButton,
          pressed && styles.startButtonPressed,
        ]}
      >
        <Text style={styles.startButtonText}>Start Workout</Text>
      </Pressable>

      {recentWorkouts.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Workouts</Text>
          {recentWorkouts.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => handleWorkoutPress(w.id)}
              style={({ pressed }) => [
                styles.workoutRow,
                pressed && styles.workoutRowPressed,
              ]}
            >
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutName}>
                  {w.name || 'Workout'}
                </Text>
                <Text style={styles.workoutMeta}>
                  {formatDate(w.started_at)} · {w.exerciseCount} exercise
                  {w.exerciseCount !== 1 ? 's' : ''} · {w.setCount} set
                  {w.setCount !== 1 ? 's' : ''}
                </Text>
              </View>
              {w.finished_at && (
                <Text style={styles.workoutDuration}>
                  {formatDuration(w.started_at, w.finished_at)}
                </Text>
              )}
            </Pressable>
          ))}
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
      paddingHorizontal: 16,
    },
    header: {
      alignItems: 'center',
      paddingTop: 48,
      paddingBottom: 32,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    startButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 32,
    },
    startButtonPressed: {
      backgroundColor: colors.primaryDark,
    },
    startButtonText: {
      color: '#ffffff',
      fontSize: 17,
      fontWeight: '600',
    },
    recentSection: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    workoutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
    },
    workoutRowPressed: {
      backgroundColor: colors.bgMuted,
    },
    workoutInfo: {
      flex: 1,
    },
    workoutName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    workoutMeta: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    workoutDuration: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
    },
  });
