import { memo, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useShallow } from 'zustand/react/shallow';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import AnimatedPressable from './AnimatedPressable';
import { useWorkoutStore, type WorkoutSet } from '@/store/useWorkoutStore';
import { getLastPerformance } from '@/db/workouts';
import { formatLastPerformance } from '@/utils/formatLastPerformance';
import SetRow from './SetRow';

interface ExerciseCardProps {
  exerciseId: number;
}

function ExerciseCard({ exerciseId }: ExerciseCardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const workoutId = useWorkoutStore((s) => s.workoutId);
  const exercise = useWorkoutStore((s) => s.exercises[exerciseId]);
  const addSet = useWorkoutStore((s) => s.addSet);
  const updateSet = useWorkoutStore((s) => s.updateSet);
  const completeSet = useWorkoutStore((s) => s.completeSet);
  const removeSet = useWorkoutStore((s) => s.removeSet);
  const removeExercise = useWorkoutStore((s) => s.removeExercise);

  const setLocalIds = useWorkoutStore(
    useShallow((s) => s.setIds.filter((sid) => s.sets[sid].exerciseId === exerciseId))
  );
  const allSets = useWorkoutStore((s) => s.sets);
  const sets: WorkoutSet[] = setLocalIds.map((sid) => allSets[sid]);

  const lastSets = useMemo(() => {
    if (workoutId === null) return [];
    return getLastPerformance(exerciseId, workoutId);
  }, [exerciseId, workoutId]);

  const lastSummary = useMemo(() => formatLastPerformance(lastSets), [lastSets]);

  const handleLongPress = useCallback(() => {
    Alert.alert('Remove Exercise', `Remove ${exercise?.exerciseName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeExercise(exerciseId),
      },
    ]);
  }, [exercise?.exerciseName, exerciseId, removeExercise]);

  if (!exercise) return null;

  return (
    <AnimatedPressable
      onLongPress={handleLongPress}
      delayLongPress={400}
      containerStyle={styles.card}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.exerciseNameWrap}>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {exercise.exerciseName}
          </Text>
        </View>
        <AnimatedPressable
          onPress={() => addSet(exerciseId)}
          hitSlop={8}
          style={({ pressed }) => [
            styles.addSetButton,
            pressed && styles.addSetButtonPressed,
          ]}
        >
          <Ionicons name="add" size={16} color={colors.primary} />
          <Text style={styles.addSetText}>Add Set</Text>
        </AnimatedPressable>
      </View>

      {/* Last performance placeholder */}
      <Text style={styles.lastPerformance}>{lastSummary}</Text>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Set column headers */}
      <View style={styles.setHeaderRow}>
        <Text style={[styles.setHeaderText, styles.setNumberCol]}>SET</Text>
        <Text style={[styles.setHeaderText, styles.weightCol]}>LBS</Text>
        <Text style={[styles.setHeaderText, styles.repsCol]}>REPS</Text>
        <View style={styles.checkCol} />
      </View>

      {/* Set rows */}
      {sets.map((s) => (
        <SetRow
          key={s.localId}
          localId={s.localId}
          setOrder={s.setOrder}
          weight={s.weight}
          reps={s.reps}
          isComplete={s.isComplete}
          onUpdateSet={updateSet}
          onCompleteSet={completeSet}
          onRemoveSet={removeSet}
        />
      ))}
    </AnimatedPressable>
  );
}

export default memo(ExerciseCard);

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 4,
    },
    exerciseNameWrap: {
      flex: 1,
      marginRight: 12,
    },
    exerciseName: {
      fontSize: 16,
      fontFamily: fonts.semiBold,
      color: colors.text,
    },
    addSetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
    },
    addSetButtonPressed: {
      backgroundColor: colors.primaryLight,
    },
    addSetText: {
      fontSize: 13,
      fontFamily: fonts.semiBold,
      color: colors.primary,
    },
    lastPerformance: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.divider,
    },
    setHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    setHeaderText: {
      fontSize: 11,
      fontFamily: fonts.semiBold,
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    setNumberCol: {
      width: 40,
    },
    weightCol: {
      flex: 1,
      textAlign: 'center',
    },
    repsCol: {
      flex: 1,
      textAlign: 'center',
    },
    checkCol: {
      width: 56,
      alignItems: 'center',
    },
  });
