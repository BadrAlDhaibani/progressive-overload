import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { useColors, type Colors } from '@/constants/colors';
import { cardShadow } from '@/constants/shadows';
import { fonts } from '@/constants/typography';
import AnimatedScreen from '@/components/AnimatedScreen';
import AnimatedPressable from '@/components/AnimatedPressable';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import ExerciseCard from '@/components/ExerciseCard';

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function WorkoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
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
    const sets = useWorkoutStore.getState().sets;
    const hasIncomplete = Object.values(sets).some((s) => !s.isComplete);

    const doFinish = () => {
      const id = workoutId;
      finish();
      router.replace(`/workout/summary?workoutId=${id}`);
    };

    if (!hasIncomplete) {
      doFinish();
      return;
    }

    Alert.alert('Finish Workout?', 'Incomplete sets will not be saved.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Finish', onPress: doFinish },
    ]);
  }, [finish, workoutId]);

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
      <AnimatedScreen>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
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

            <AnimatedPressable
              style={({ pressed }) => [
                styles.addExerciseButton,
                pressed && styles.addExerciseButtonPressed,
              ]}
              onPress={() => router.push('/workout/add-exercise')}
            >
              <Text style={styles.addExerciseText}>+ Add Exercise</Text>
            </AnimatedPressable>
          </ScrollView>

          <View style={styles.bottomBar}>
            <AnimatedPressable
              containerStyle={{ flex: 1 }}
              onPress={handleDiscard}
              style={({ pressed }) => [
                styles.discardButton,
                pressed && styles.discardButtonPressed,
              ]}
            >
              <Text style={styles.discardText}>Discard</Text>
            </AnimatedPressable>
            <AnimatedPressable
              containerStyle={{ flex: 1 }}
              onPress={handleFinish}
              style={({ pressed }) => [
                styles.finishButton,
                pressed && styles.finishButtonPressed,
              ]}
            >
              <Text style={styles.finishText}>Finish Workout</Text>
            </AnimatedPressable>
          </View>
        </KeyboardAvoidingView>

        <View style={[styles.floatingTimer, { paddingTop: insets.top }]} pointerEvents="none">
          <BlurView
            intensity={80}
            tint={colors.isDark ? 'dark' : 'light'}
            style={styles.blurContainer}
          >
            <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>
          </BlurView>
        </View>
      </SafeAreaView>
      </AnimatedScreen>
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
      paddingTop: 72,
    },
    floatingTimer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    blurContainer: {
      paddingVertical: 12,
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    timerText: {
      fontSize: 28,
      fontFamily: fonts.bold,
      color: colors.text,
      textAlign: 'center',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    emptyTitle: {
      fontSize: 17,
      fontFamily: fonts.semiBold,
      color: colors.text,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 15,
      fontFamily: fonts.regular,
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
      fontFamily: fonts.semiBold,
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
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 12,
    },
    discardButtonPressed: {
      backgroundColor: colors.bgMuted,
    },
    discardText: {
      fontSize: 15,
      fontFamily: fonts.semiBold,
      color: colors.error,
    },
    finishButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      ...cardShadow(colors),
    },
    finishButtonPressed: {
      backgroundColor: colors.primaryDark,
    },
    finishText: {
      fontSize: 15,
      fontFamily: fonts.semiBold,
      color: colors.textOnPrimary,
    },
  });
