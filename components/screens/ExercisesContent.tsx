import { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useColors, type Colors } from '@/constants/colors';
import { useMuscleGroupColors } from '@/constants/muscleGroupColors';
import AnimatedScreen from '@/components/AnimatedScreen';
import { muscleGroups, type MuscleGroup } from '@/constants/muscleGroups';
import { fonts } from '@/constants/typography';
import {
  getAllExercises,
  getExercisesByMuscleGroup,
  searchExercises,
  insertCustomExercise,
  type Exercise,
} from '@/db/exercises';
import ExerciseListItem from '@/components/ExerciseListItem';

const equipmentOptions = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight'] as const;

export default function ExercisesContent() {
  const colors = useColors();
  const mgColors = useMuscleGroupColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Add custom exercise modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscleGroup, setNewMuscleGroup] = useState<string>(muscleGroups[0]);
  const [newEquipment, setNewEquipment] = useState<string>(equipmentOptions[0]);

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

  const handleAddExercise = useCallback(() => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    insertCustomExercise(trimmed, newMuscleGroup, newEquipment);
    setRefreshKey((k) => k + 1);
    setModalVisible(false);
    setNewName('');
    setNewMuscleGroup(muscleGroups[0]);
    setNewEquipment(equipmentOptions[0]);
  }, [newName, newMuscleGroup, newEquipment]);

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => <ExerciseListItem exercise={item} />,
    []
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

      {/* Add Custom Exercise Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={Keyboard.dismiss}>
              <Text style={styles.modalTitle}>Add Exercise</Text>

              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Exercise name"
                placeholderTextColor={colors.textMuted}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />

              <Text style={styles.fieldLabel}>Muscle Group</Text>
              <FlatList
                horizontal
                data={muscleGroups}
                keyExtractor={(item) => item}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipList}
                style={styles.modalChipRow}
                renderItem={({ item }) => {
                  const isActive = item === newMuscleGroup;
                  return (
                    <Pressable
                      style={[
                        styles.chip,
                        isActive && { backgroundColor: mgColors[item].text },
                      ]}
                      onPress={() => setNewMuscleGroup(item)}
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

              <Text style={styles.fieldLabel}>Equipment</Text>
              <FlatList
                horizontal
                data={equipmentOptions}
                keyExtractor={(item) => item}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipList}
                style={styles.modalChipRow}
                renderItem={({ item }) => {
                  const isActive = item === newEquipment;
                  return (
                    <Pressable
                      style={[
                        styles.chip,
                        isActive && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => setNewEquipment(item)}
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

              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.saveButton,
                    !newName.trim() && styles.saveButtonDisabled,
                  ]}
                  onPress={handleAddExercise}
                  disabled={!newName.trim()}
                >
                  <Text style={styles.saveButtonText}>Add</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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

    // Modal styles
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalContent: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 32,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: fonts.bold,
      color: colors.text,
      marginBottom: 20,
    },
    fieldLabel: {
      fontSize: 13,
      fontFamily: fonts.semiBold,
      color: colors.textSecondary,
      marginBottom: 8,
      marginTop: 12,
    },
    modalInput: {
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      fontSize: 15,
      fontFamily: fonts.regular,
      color: colors.text,
    },
    modalChipRow: {
      flexGrow: 0,
    },
    modalButtons: {
      flexDirection: 'row',
      marginTop: 24,
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.bgMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontFamily: fonts.semiBold,
      color: colors.textSecondary,
    },
    saveButton: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      fontSize: 16,
      fontFamily: fonts.semiBold,
      color: colors.textOnPrimary,
    },
  });
