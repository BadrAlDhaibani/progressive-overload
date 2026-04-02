import { memo, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useShallow } from 'zustand/react/shallow';

import { useColors, type Colors } from '@/constants/colors';
import { useWorkoutStore, type WorkoutSet } from '@/store/useWorkoutStore';
import SetRow from './SetRow';

interface ExerciseCardProps {
  exerciseId: number;
}

function ExerciseCard({ exerciseId }: ExerciseCardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const exercise = useWorkoutStore((s) => s.exercises[exerciseId]);
  const addSet = useWorkoutStore((s) => s.addSet);
  const updateSet = useWorkoutStore((s) => s.updateSet);
  const completeSet = useWorkoutStore((s) => s.completeSet);

  const setLocalIds = useWorkoutStore(
    useShallow((s) => s.setIds.filter((sid) => s.sets[sid].exerciseId === exerciseId))
  );
  const allSets = useWorkoutStore((s) => s.sets);
  const sets: WorkoutSet[] = setLocalIds.map((sid) => allSets[sid]);

  if (!exercise) return null;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.exerciseName} numberOfLines={1}>
          {exercise.exerciseName}
        </Text>
        <Pressable
          onPress={() => addSet(exerciseId)}
          hitSlop={8}
          style={({ pressed }) => [
            styles.addSetButton,
            pressed && styles.addSetButtonPressed,
          ]}
        >
          <Ionicons name="add" size={16} color={colors.primary} />
          <Text style={styles.addSetText}>Add Set</Text>
        </Pressable>
      </View>

      {/* Last performance placeholder */}
      <Text style={styles.lastPerformance}>Last: --</Text>

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
        />
      ))}
    </View>
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
    exerciseName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
      marginRight: 12,
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
      fontWeight: '600',
      color: colors.primary,
    },
    lastPerformance: {
      fontSize: 13,
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
      fontWeight: '600',
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
