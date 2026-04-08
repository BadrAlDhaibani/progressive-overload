import { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';

import { useColors, type Colors } from '@/constants/colors';
import { cardShadow } from '@/constants/shadows';
import AnimatedScreen from '@/components/AnimatedScreen';
import { fonts } from '@/constants/typography';
import { createWorkout, getRecentWorkouts, getLastPerformance } from '@/db/workouts';
import { getWorkoutSets } from '@/db/workouts';
import { getAllTemplates, getTemplateWithExercises, deleteTemplate } from '@/db/templates';
import type { Template } from '@/db/templates';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import type { Workout } from '@/db/workouts';

const CARD_GAP = 12;

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
  const addExercise = useWorkoutStore((s) => s.addExercise);
  const addSet = useWorkoutStore((s) => s.addSet);
  const addSetWithValues = useWorkoutStore((s) => s.addSetWithValues);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
  const [templates, setTemplates] = useState<(Template & { exerciseCount: number })[]>([]);
  const loadTemplates = useCallback(() => {
    const allTemplates = getAllTemplates();
    const withCounts = allTemplates.map((t) => {
      const data = getTemplateWithExercises(t.id);
      return { ...t, exerciseCount: data?.exercises.length ?? 0 };
    });
    setTemplates(withCounts);
  }, []);

  const loadData = useCallback(() => {
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
    loadTemplates();
  }, [loadTemplates]);

  useFocusEffect(loadData);

  const handleStartWorkout = useCallback(() => {
    const id = createWorkout();
    startWorkout(id);
    router.push(`/workout/${id}`);
  }, [startWorkout, router]);

  const handleStartFromTemplate = useCallback(
    (templateId: number, templateName: string) => {
      const data = getTemplateWithExercises(templateId);
      if (!data) return;

      const id = createWorkout(templateName);
      startWorkout(id);

      for (const ex of data.exercises) {
        addExercise(ex.exercise_id, ex.exercise_name, ex.muscle_group);

        const lastSets = getLastPerformance(ex.exercise_id, id);
        if (lastSets.length > 0) {
          for (const s of lastSets) {
            addSetWithValues(ex.exercise_id, s.weight, s.reps);
          }
        } else {
          const count = ex.default_sets || 1;
          for (let i = 0; i < count; i++) {
            addSetWithValues(ex.exercise_id, null, ex.default_reps || null);
          }
        }
      }

      router.push(`/workout/${id}`);
    },
    [startWorkout, addExercise, addSet, addSetWithValues, router]
  );

  const handleTemplateLongPress = useCallback(
    (templateId: number, templateName: string) => {
      Alert.alert(templateName, undefined, [
        {
          text: 'Edit',
          onPress: () => router.push(`/template/edit?templateId=${templateId}`),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Template',
              `Delete "${templateName}"? This cannot be undone.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    deleteTemplate(templateId);
                    loadTemplates();
                  },
                },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [router, loadTemplates]
  );

  const handleWorkoutPress = useCallback(
    (workoutId: number) => {
      router.push(`/workout/summary?workoutId=${workoutId}&from=history`);
    },
    [router]
  );

  return (
    <AnimatedScreen>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={loadData}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
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

      <View style={styles.templatesSection}>
        <Text style={styles.sectionTitle}>Templates</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
        >
          <Pressable
            onPress={() => router.push('/template/edit')}
            style={({ pressed }) => [
              styles.templateCard,
              styles.addTemplateCard,
              pressed && styles.templateCardPressed,
            ]}
          >
            <Ionicons name="add" size={28} color={colors.primary} />
            <Text style={styles.addTemplateText}>New</Text>
          </Pressable>
          {templates.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => handleStartFromTemplate(t.id, t.name)}
              onLongPress={() => handleTemplateLongPress(t.id, t.name)}
              style={({ pressed }) => [
                styles.templateCard,
                pressed && styles.templateCardPressed,
              ]}
            >
              <Text style={styles.templateName}>{t.name}</Text>
              <Text style={styles.templateMeta}>
                {t.exerciseCount} exercise{t.exerciseCount !== 1 ? 's' : ''}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

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
    </ScrollView>
    </AnimatedScreen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    contentContainer: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    header: {
      alignItems: 'center',
      paddingTop: 48,
      paddingBottom: 32,
    },
    title: {
      fontSize: 28,
      fontFamily: fonts.bold,
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    startButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 32,
      ...cardShadow,
    },
    startButtonPressed: {
      backgroundColor: colors.primaryDark,
    },
    startButtonText: {
      color: colors.textOnPrimary,
      fontSize: 17,
      fontFamily: fonts.semiBold,
    },
    templatesSection: {
      marginBottom: 24,
    },
    carouselContent: {
      paddingRight: 16,
    },
    templateCard: {
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: 16,
      marginRight: CARD_GAP,
      minWidth: 140,
    },
    templateCardPressed: {
      backgroundColor: colors.bgMuted,
    },
    templateName: {
      fontSize: 15,
      fontFamily: fonts.semiBold,
      color: colors.text,
      marginBottom: 4,
    },
    templateMeta: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    addTemplateCard: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      backgroundColor: colors.bg,
      minWidth: 0,
      width: 72,
      padding: 0,
    },
    addTemplateText: {
      fontSize: 13,
      fontFamily: fonts.medium,
      color: colors.primary,
      marginTop: 4,
    },
    recentSection: {
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: fonts.semiBold,
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
  });
