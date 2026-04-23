import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useColors, type Colors } from '@/constants/colors';
import { useMuscleGroupColors } from '@/constants/muscleGroupColors';
import { muscleGroups } from '@/constants/muscleGroups';
import { equipmentOptions } from '@/constants/equipment';
import { fonts } from '@/constants/typography';
import { insertCustomExercise } from '@/db/exercises';
import AnimatedPressable from '@/components/AnimatedPressable';
import { useWorkoutStore } from '@/store/useWorkoutStore';

export default function NewExerciseScreen() {
  const colors = useColors();
  const mgColors = useMuscleGroupColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<string>(muscleGroups[0]);
  const [equipment, setEquipment] = useState<string>(equipmentOptions[0]);
  const [isAssisted, setIsAssisted] = useState(false);

  const canSubmit = name.trim().length > 0;

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const id = insertCustomExercise(trimmed, muscleGroup, equipment, isAssisted);

    const { workoutId, addExercise, addSet } = useWorkoutStore.getState();
    if (workoutId !== null) {
      addExercise(id, trimmed, muscleGroup, isAssisted);
      addSet(id);
      router.dismiss(2);
    } else {
      router.back();
    }
  }, [name, muscleGroup, equipment, isAssisted]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Custom Exercise</Text>
        <AnimatedPressable
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </AnimatedPressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Exercise name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          <Text style={styles.fieldLabel}>Muscle Group</Text>
          <FlatList
            horizontal
            data={muscleGroups}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipList}
            style={styles.chipRow}
            renderItem={({ item }) => {
              const isActive = item === muscleGroup;
              return (
                <Pressable
                  style={[
                    styles.chip,
                    isActive && { backgroundColor: mgColors[item].text },
                  ]}
                  onPress={() => setMuscleGroup(item)}
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
            style={styles.chipRow}
            renderItem={({ item }) => {
              const isActive = item === equipment;
              return (
                <Pressable
                  style={[
                    styles.chip,
                    isActive && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setEquipment(item)}
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

          <Pressable style={styles.assistedRow} onPress={() => setIsAssisted((v) => !v)}>
            <View style={styles.assistedLabel}>
              <Text style={styles.fieldLabel}>Assisted</Text>
              <Text style={styles.assistedHint}>e.g., pull-up machine</Text>
            </View>
            <Switch
              value={isAssisted}
              onValueChange={setIsAssisted}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={isAssisted ? colors.primary : colors.bgMuted}
            />
          </Pressable>

          <AnimatedPressable
            onPress={handleSubmit}
            containerStyle={styles.cta}
            disabled={!canSubmit}
          >
            <View style={[styles.ctaInner, !canSubmit && styles.ctaDisabled]}>
              <Text style={styles.ctaText}>Add</Text>
            </View>
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    flex: {
      flex: 1,
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
      fontFamily: fonts.bold,
      color: colors.text,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    fieldLabel: {
      fontSize: 13,
      fontFamily: fonts.semiBold,
      color: colors.textSecondary,
      marginBottom: 8,
      marginTop: 12,
    },
    input: {
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      fontSize: 15,
      fontFamily: fonts.regular,
      color: colors.text,
    },
    chipRow: {
      flexGrow: 0,
    },
    chipList: {
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
    assistedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
      paddingVertical: 4,
    },
    assistedLabel: {
      flex: 1,
    },
    assistedHint: {
      fontSize: 12,
      fontFamily: fonts.regular,
      color: colors.textMuted,
      marginTop: 2,
    },
    cta: {
      marginTop: 24,
      borderRadius: 12,
    },
    ctaInner: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    ctaDisabled: {
      backgroundColor: colors.textMuted,
    },
    ctaText: {
      fontSize: 16,
      fontFamily: fonts.semiBold,
      color: colors.textOnPrimary,
    },
  });
