import { memo, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';

import { useColors, type Colors } from '@/constants/colors';
import { useMuscleGroupColors } from '@/constants/muscleGroupColors';
import type { MuscleGroup } from '@/constants/muscleGroups';
import { fonts } from '@/constants/typography';
import type { Exercise } from '@/db/exercises';

interface Props {
  exercise: Exercise;
  onPress?: (exercise: Exercise) => void;
  onLongPress?: (exercise: Exercise) => void;
}

function ExerciseListItem({ exercise, onPress, onLongPress }: Props) {
  const colors = useColors();
  const mgColors = useMuscleGroupColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const badgeColor = mgColors[exercise.muscle_group as MuscleGroup] ?? { bg: colors.primaryLight, text: colors.primary };

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress?.(exercise)}
      onLongPress={onLongPress ? () => onLongPress(exercise) : undefined}
    >
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text style={styles.equipment}>{exercise.equipment}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: badgeColor.bg }]}>
        <Text style={[styles.badgeText, { color: badgeColor.text }]}>
          {exercise.muscle_group}
        </Text>
      </View>
    </Pressable>
  );
}

export default memo(ExerciseListItem);

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.bg,
    },
    rowPressed: {
      backgroundColor: colors.bgMuted,
    },
    info: {
      flex: 1,
      marginRight: 12,
    },
    name: {
      fontSize: 15,
      fontFamily: fonts.medium,
      color: colors.text,
    },
    equipment: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginTop: 2,
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
  });
