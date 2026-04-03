import { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useColors, type Colors } from '@/constants/colors';
import { muscleGroups } from '@/constants/muscleGroups';
import {
  getAllExercises,
  getExercisesByMuscleGroup,
  searchExercises,
  type Exercise,
} from '@/db/exercises';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { getLastPerformance } from '@/db/workouts';
import ExerciseListItem from '@/components/ExerciseListItem';

export default function AddExerciseScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const workoutId = useWorkoutStore((s) => s.workoutId);
  const exerciseIds = useWorkoutStore((s) => s.exerciseIds);
  const addExercise = useWorkoutStore((s) => s.addExercise);
  const addSet = useWorkoutStore((s) => s.addSet);
  const addSetWithValues = useWorkoutStore((s) => s.addSetWithValues);

  const exercises = useMemo(() => {
    if (search.trim()) {
      const results = searchExercises(search.trim());
      if (activeGroup) {
        return results.filter((e) => e.muscle_group === activeGroup);
      }
      return results;
    }
    if (activeGroup) {
      return getExercisesByMuscleGroup(activeGroup);
    }
    return getAllExercises();
  }, [search, activeGroup]);

  const handleChipPress = useCallback((group: string) => {
    setActiveGroup((prev) => (prev === group ? null : group));
  }, []);

  const handleSelect = useCallback(
    (exercise: Exercise) => {
      if (exerciseIds.includes(exercise.id)) return;
      addExercise(exercise.id, exercise.name, exercise.muscle_group);

      const lastSets = workoutId !== null
        ? getLastPerformance(exercise.id, workoutId)
        : [];

      if (lastSets.length > 0) {
        for (const s of lastSets) {
          addSetWithValues(exercise.id, s.weight, s.reps);
        }
      } else {
        addSet(exercise.id);
      }

      router.back();
    },
    [exerciseIds, workoutId, addExercise, addSet, addSetWithValues]
  );

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => {
      const alreadyAdded = exerciseIds.includes(item.id);
      if (alreadyAdded) {
        return (
          <View style={styles.disabledRow}>
            <View style={styles.info}>
              <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.equipmentText}>{item.equipment}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
          </View>
        );
      }
      return (
        <ExerciseListItem exercise={item} onPress={handleSelect} />
      );
    },
    [exerciseIds, handleSelect, styles, colors]
  );

  const keyExtractor = useCallback((item: Exercise) => item.id.toString(), []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Add Exercise</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Muscle group chips */}
      <FlatList
        horizontal
        data={muscleGroups}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipList}
        style={styles.chipContainer}
        renderItem={({ item }) => {
          const isActive = item === activeGroup;
          return (
            <Pressable
              style={[styles.chip, isActive && { backgroundColor: colors.primary }]}
              onPress={() => handleChipPress(item)}
            >
              <Text style={[styles.chipText, isActive && { color: '#ffffff' }]}>
                {item}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Exercise list */}
      <FlatList
        data={exercises}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={exercises.length === 0 ? styles.emptyContainer : undefined}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardDismissMode="on-drag"
        ListEmptyComponent={<Text style={styles.emptyText}>No exercises found</Text>}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonPressed: {
      backgroundColor: colors.bgMuted,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 12,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.bgMuted,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      paddingVertical: 0,
    },
    chipContainer: {
      flexGrow: 0,
      marginBottom: 8,
    },
    chipList: {
      paddingHorizontal: 16,
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.bgMuted,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    list: {
      flex: 1,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.divider,
      marginLeft: 16,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    disabledRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      opacity: 0.5,
    },
    info: {
      flex: 1,
      marginRight: 12,
    },
    nameText: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    equipmentText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
