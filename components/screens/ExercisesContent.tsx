import { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useColors, type Colors } from '@/constants/colors';
import { useMuscleGroupColors } from '@/constants/muscleGroupColors';
import AnimatedScreen from '@/components/AnimatedScreen';
import AddExerciseModal from '@/components/AddExerciseModal';
import { muscleGroups, type MuscleGroup } from '@/constants/muscleGroups';
import { fonts } from '@/constants/typography';
import {
  getAllExercises,
  getExercisesByMuscleGroup,
  searchExercises,
  getExerciseUsage,
  deleteExercise,
  type Exercise,
} from '@/db/exercises';
import ExerciseListItem from '@/components/ExerciseListItem';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default function ExercisesContent() {
  const colors = useColors();
  const mgColors = useMuscleGroupColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

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
  }, [search, activeGroup, refreshKey]);

  const handleChipPress = useCallback((group: string) => {
    setActiveGroup((prev) => (prev === group ? null : group));
  }, []);

  const handleModalClose = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setModalVisible(false);
  }, []);

  const handleExercisePress = useCallback((exercise: Exercise) => {
    router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } });
  }, []);

  const handleExerciseLongPress = useCallback((exercise: Exercise) => {
    const usage = getExerciseUsage(exercise.id);
    const { setsCount, workoutsCount, templatesCount } = usage;

    let message: string;
    if (setsCount === 0 && templatesCount === 0) {
      message = 'This cannot be undone.';
    } else {
      const parts: string[] = [];
      if (setsCount > 0) {
        parts.push(`${plural(setsCount, 'set')} across ${plural(workoutsCount, 'workout')}`);
      }
      if (templatesCount > 0) {
        parts.push(`remove it from ${plural(templatesCount, 'template')}`);
      }
      message = `This will permanently delete ${parts.join(', and ')}. This cannot be undone.`;
    }

    Alert.alert(`Delete '${exercise.name}'?`, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteExercise(exercise.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setRefreshKey((k) => k + 1);
        },
      },
    ]);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => (
      <ExerciseListItem
        exercise={item}
        onPress={handleExercisePress}
        onLongPress={handleExerciseLongPress}
      />
    ),
    [handleExercisePress, handleExerciseLongPress]
  );

  const keyExtractor = useCallback((item: Exercise) => item.id.toString(), []);

  const Separator = useCallback(() => <View style={styles.separator} />, [styles]);


  return (
    <AnimatedScreen>
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Exercises</Text>
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={22} color={colors.primary} />
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
              style={[
                styles.chip,
                isActive && { backgroundColor: mgColors[item].text },
              ]}
              onPress={() => handleChipPress(item)}
            >
              <Text
                style={[
                  styles.chipText,
                  isActive && { color: colors.textOnPrimary },
                ]}
              >
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
        ItemSeparatorComponent={Separator}
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => setRefreshKey((k) => k + 1)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No exercises found</Text>
        }
      />

      <AddExerciseModal
        visible={modalVisible}
        onClose={handleModalClose}
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    title: {
      fontSize: 28,
      fontFamily: fonts.bold,
      color: colors.text,
    },
    addButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButtonPressed: {
      backgroundColor: colors.primaryMedium,
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
      fontFamily: fonts.regular,
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
      fontFamily: fonts.medium,
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
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },

  });
