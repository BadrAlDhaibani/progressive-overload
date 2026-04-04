import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useColors, type Colors } from '@/constants/colors';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import ExerciseCard from '@/components/ExerciseCard';

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function WorkoutScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const workoutId = useWorkoutStore((s) => s.workoutId);
  const exerciseIds = useWorkoutStore((s) => s.exerciseIds);
  const startedAt = useWorkoutStore((s) => s.startedAt);
  const finish = useWorkoutStore((s) => s.finishWorkout);
  const discard = useWorkoutStore((s) => s.discardWorkout);

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const handleFinish = useCallback(() => {
    Alert.alert('Finish Workout?', 'Incomplete sets will not be saved.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish',
        onPress: () => {
          const id = workoutId;
          finish();
          router.replace(`/workout/summary?workoutId=${id}`);
        },
      },
    ]);
  }, [finish]);

  const handleDiscard = useCallback(() => {
    Alert.alert('Discard Workout?', 'All progress will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          discard();
          router.back();
        },
      },
    ]);
  }, [discard]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleDiscard();
      return true;
    });
    return () => sub.remove();
  }, [handleDiscard]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>

            {exerciseIds.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No exercises yet</Text>
                <Text style={styles.emptySubtitle}>
                  Add exercises to get started
                </Text>
              </View>
            ) : (
              exerciseIds.map((id) => (
                <ExerciseCard key={id} exerciseId={id} />
              ))
            )}

            <Pressable
              style={({ pressed }) => [
                styles.addExerciseButton,
                pressed && styles.addExerciseButtonPressed,
              ]}
              onPress={() => router.push('/workout/add-exercise')}
            >
              <Text style={styles.addExerciseText}>+ Add Exercise</Text>
            </Pressable>
          </ScrollView>

          <View style={styles.bottomBar}>
            <Pressable
              onPress={handleDiscard}
              style={({ pressed }) => [
                styles.discardButton,
                pressed && styles.discardButtonPressed,
              ]}
            >
              <Text style={styles.discardText}>Discard</Text>
            </Pressable>
            <Pressable
              onPress={handleFinish}
              style={({ pressed }) => [
                styles.finishButton,
                pressed && styles.finishButtonPressed,
              ]}
            >
              <Text style={styles.finishText}>Finish Workout</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
    flex: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 16,
    },
    timerText: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 24,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    addExerciseButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 16,
    },
    addExerciseButtonPressed: {
      backgroundColor: colors.bgMuted,
    },
    addExerciseText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },
    bottomBar: {
      flexDirection: 'row',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    discardButton: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 12,
    },
    discardButtonPressed: {
      backgroundColor: colors.bgMuted,
    },
    discardText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.error,
    },
    finishButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    finishButtonPressed: {
      backgroundColor: colors.primaryDark,
    },
    finishText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#ffffff',
    },
  });
