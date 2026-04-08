import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, SectionList, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import AnimatedScreen from '@/components/AnimatedScreen';
import AnimatedPressable from '@/components/AnimatedPressable';
import { getAllWorkouts, getWorkoutSets } from '@/db/workouts';
import type { Workout } from '@/db/workouts';

interface EnrichedWorkout extends Workout {
  setCount: number;
  exerciseCount: number;
}

interface WorkoutSection {
  title: string;
  data: EnrichedWorkout[];
}

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

function groupByMonth(workouts: EnrichedWorkout[]): WorkoutSection[] {
  const sections: WorkoutSection[] = [];
  let currentKey = '';
  let currentSection: WorkoutSection | null = null;

  for (const w of workouts) {
    const date = new Date(w.started_at + 'Z');
    const key = date.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });

    if (key !== currentKey) {
      currentKey = key;
      currentSection = { title: key, data: [] };
      sections.push(currentSection);
    }
    currentSection!.data.push(w);
  }

  return sections;
}

export default function HistoryContent() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [workouts, setWorkouts] = useState<EnrichedWorkout[]>([]);
  const loadWorkouts = useCallback(() => {
    const all = getAllWorkouts();
    const enriched: EnrichedWorkout[] = all.map((w) => {
      const sets = getWorkoutSets(w.id);
      const completedSets = sets.filter((s) => s.is_complete);
      const exerciseIds = new Set(completedSets.map((s) => s.exercise_id));
      return {
        ...w,
        setCount: completedSets.length,
        exerciseCount: exerciseIds.size,
      };
    });
    setWorkouts(enriched);
  }, []);

  useFocusEffect(loadWorkouts);

  const sections = useMemo(() => groupByMonth(workouts), [workouts]);

  const handleWorkoutPress = useCallback(
    (workoutId: number) => {
      router.push(`/workout/summary?workoutId=${workoutId}&from=history`);
    },
    [router]
  );

  if (workouts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No workouts yet</Text>
        <Text style={styles.hintText}>Complete a workout to see it here</Text>
      </View>
    );
  }

  return (
    <AnimatedScreen>
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={loadWorkouts}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderItem={({ item }) => (
          <AnimatedPressable
            onPress={() => handleWorkoutPress(item.id)}
            style={({ pressed }) => [
              styles.workoutRow,
              pressed && styles.workoutRowPressed,
            ]}
          >
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutName}>
                {item.name || 'Workout'}
              </Text>
              <Text style={styles.workoutMeta}>
                {formatDate(item.started_at)} · {item.exerciseCount} exercise
                {item.exerciseCount !== 1 ? 's' : ''} · {item.setCount} set
                {item.setCount !== 1 ? 's' : ''}
              </Text>
            </View>
            {item.finished_at && (
              <Text style={styles.workoutDuration}>
                {formatDuration(item.started_at, item.finished_at)}
              </Text>
            )}
          </AnimatedPressable>
        )}
      />
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
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
    },
    sectionHeader: {
      fontSize: 16,
      fontFamily: fonts.semiBold,
      color: colors.text,
      marginBottom: 12,
      marginTop: 16,
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
      fontFamily: fonts.semiBold,
      color: colors.text,
      marginBottom: 4,
    },
    workoutMeta: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    workoutDuration: {
      fontSize: 14,
      fontFamily: fonts.semiBold,
      color: colors.textMuted,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bg,
      paddingHorizontal: 16,
    },
    emptyText: {
      fontSize: 17,
      fontFamily: fonts.semiBold,
      color: colors.text,
      marginBottom: 8,
    },
    hintText: {
      fontSize: 15,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
  });
