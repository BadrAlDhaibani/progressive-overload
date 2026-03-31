import { memo, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';

import { useColors, type Colors } from '@/constants/colors';
import type { Exercise } from '@/db/exercises';

interface Props {
  exercise: Exercise;
  onPress?: (exercise: Exercise) => void;
}

function ExerciseListItem({ exercise, onPress }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress?.(exercise)}
    >
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text style={styles.equipment}>{exercise.equipment}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
        <Text style={[styles.badgeText, { color: colors.primary }]}>
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
      fontWeight: '500',
      color: colors.text,
    },
    equipment: {
      fontSize: 13,
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
      fontWeight: '600',
    },
  });
