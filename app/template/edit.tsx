import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
  Pressable,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import {
  getTemplateWithExercises,
  createTemplate,
  updateTemplate,
  replaceTemplateExercises,
} from '@/db/templates';
import {
  useTemplateFormStore,
  type TemplateExerciseEntry,
} from '@/store/useTemplateFormStore';

export default function TemplateEditScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();

  const isEdit = !!templateId;
  const [name, setName] = useState('');
  const [initialized, setInitialized] = useState(false);

  const exercises = useTemplateFormStore((s) => s.exercises);
  const removeExercise = useTemplateFormStore((s) => s.removeExercise);
  const updateDefaults = useTemplateFormStore((s) => s.updateDefaults);
  const setExercises = useTemplateFormStore((s) => s.setExercises);
  const reset = useTemplateFormStore((s) => s.reset);

  useEffect(() => {
    if (initialized) return;
    if (isEdit) {
      const data = getTemplateWithExercises(Number(templateId));
      if (data) {
        setName(data.template.name);
        setExercises(
          data.exercises.map((e) => ({
            exercise_id: e.exercise_id,
            exercise_name: e.exercise_name,
            muscle_group: e.muscle_group,
            equipment: e.equipment,
            is_assisted: e.is_assisted,
            default_sets: e.default_sets,
            default_reps: e.default_reps,
          }))
        );
      }
    } else {
      reset();
    }
    setInitialized(true);
  }, []);

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Template Name', 'Please enter a name for this template.');
      return;
    }

    const mapped = exercises.map((e, i) => ({
      exercise_id: e.exercise_id,
      sort_order: i + 1,
      default_sets: e.default_sets,
      default_reps: e.default_reps,
    }));

    if (isEdit) {
      const id = Number(templateId);
      updateTemplate(id, trimmed);
      replaceTemplateExercises(id, mapped);
    } else {
      const id = createTemplate(trimmed);
      replaceTemplateExercises(id, mapped);
    }

    router.back();
  }, [name, exercises, isEdit, templateId]);

  const handleClose = useCallback(() => {
    reset();
    router.back();
  }, [reset]);

  const handleRemoveExercise = useCallback(
    (exerciseId: number, exerciseName: string) => {
      Alert.alert(
        'Remove Exercise',
        `Remove ${exerciseName} from this template?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => removeExercise(exerciseId),
          },
        ]
      );
    },
    [removeExercise]
  );

  const renderExercise = useCallback(
    ({ item }: { item: TemplateExerciseEntry }) => (
      <ExerciseRow
        item={item}
        colors={colors}
        styles={styles}
        onRemove={handleRemoveExercise}
        onUpdateDefaults={updateDefaults}
      />
    ),
    [colors, styles, handleRemoveExercise, updateDefaults]
  );

  const Separator = useCallback(
    () => <View style={styles.separator} />,
    [styles]
  );

  const keyExtractor = useCallback(
    (item: TemplateExerciseEntry) => item.exercise_id.toString(),
    []
  );

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={handleClose}
          hitSlop={8}
          style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit Template' : 'New Template'}
        </Text>
        <Pressable
          onPress={handleSave}
          hitSlop={8}
          style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
        >
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>

      <View style={styles.nameContainer}>
        <TextInput
          style={styles.nameInput}
          placeholder="Template name"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          autoFocus={!isEdit}
          returnKeyType="done"
        />
      </View>

      <FlatList
        data={exercises}
        keyExtractor={keyExtractor}
        renderItem={renderExercise}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No exercises added yet</Text>
          </View>
        }
        ListFooterComponent={
          <Pressable
            onPress={() => router.push('/template/pick-exercise')}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.addButtonText}>Add Exercise</Text>
          </Pressable>
        }
        keyboardDismissMode="on-drag"
      />
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

function ExerciseRow({
  item,
  colors,
  styles,
  onRemove,
  onUpdateDefaults,
}: {
  item: TemplateExerciseEntry;
  colors: Colors;
  styles: ReturnType<typeof createStyles>;
  onRemove: (id: number, name: string) => void;
  onUpdateDefaults: (id: number, sets: number, reps: number) => void;
}) {
  const [setsText, setSetsText] = useState(String(item.default_sets));
  const [repsText, setRepsText] = useState(String(item.default_reps));

  const handleSetsEnd = useCallback(() => {
    const val = parseInt(setsText, 10);
    const sets = isNaN(val) || val < 1 ? 1 : val;
    setSetsText(String(sets));
    onUpdateDefaults(item.exercise_id, sets, item.default_reps);
  }, [setsText, item.exercise_id, item.default_reps, onUpdateDefaults]);

  const handleRepsEnd = useCallback(() => {
    const val = parseInt(repsText, 10);
    const reps = isNaN(val) || val < 1 ? 1 : val;
    setRepsText(String(reps));
    onUpdateDefaults(item.exercise_id, item.default_sets, reps);
  }, [repsText, item.exercise_id, item.default_sets, onUpdateDefaults]);

  return (
    <View style={styles.exerciseRow}>
      <View style={styles.exerciseTopRow}>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.exercise_name}</Text>
          <Text style={styles.exerciseMeta}>{item.muscle_group}</Text>
        </View>
        <Pressable
          onPress={() => onRemove(item.exercise_id, item.exercise_name)}
          hitSlop={8}
          style={styles.removeButton}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </Pressable>
      </View>
      <View style={styles.defaultsRow}>
        <TextInput
          style={styles.defaultInput}
          value={setsText}
          onChangeText={setSetsText}
          onEndEditing={handleSetsEnd}
          keyboardType="number-pad"
          selectTextOnFocus
        />
        <Text style={styles.defaultLabel}>sets</Text>
        <Text style={styles.defaultSeparator}>×</Text>
        <TextInput
          style={styles.defaultInput}
          value={repsText}
          onChangeText={setRepsText}
          onEndEditing={handleRepsEnd}
          keyboardType="number-pad"
          selectTextOnFocus
        />
        <Text style={styles.defaultLabel}>reps</Text>
      </View>
    </View>
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
    headerButton: {
      width: 44,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    },
    headerButtonPressed: {
      backgroundColor: colors.bgMuted,
    },
    headerTitle: {
      fontSize: 17,
      fontFamily: fonts.semiBold,
      color: colors.text,
    },
    saveText: {
      fontSize: 16,
      fontFamily: fonts.semiBold,
      color: colors.primary,
    },
    nameContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    nameInput: {
      fontSize: 20,
      fontFamily: fonts.bold,
      color: colors.text,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 8,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.divider,
    },
    emptyContainer: {
      paddingVertical: 48,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 15,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      marginTop: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    addButtonPressed: {
      backgroundColor: colors.bgMuted,
    },
    addButtonText: {
      fontSize: 15,
      fontFamily: fonts.medium,
      color: colors.primary,
      marginLeft: 6,
    },
    exerciseRow: {
      paddingVertical: 12,
    },
    exerciseTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    exerciseInfo: {
      flex: 1,
      marginRight: 12,
    },
    exerciseName: {
      fontSize: 15,
      fontFamily: fonts.semiBold,
      color: colors.text,
    },
    exerciseMeta: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginTop: 2,
    },
    defaultsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    defaultInput: {
      width: 40,
      height: 34,
      borderRadius: 8,
      backgroundColor: colors.bgMuted,
      textAlign: 'center',
      fontSize: 15,
      fontFamily: fonts.semiBold,
      color: colors.text,
    },
    defaultLabel: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginLeft: 3,
      marginRight: 8,
    },
    defaultSeparator: {
      fontSize: 14,
      fontFamily: fonts.regular,
      color: colors.textMuted,
      marginRight: 8,
    },
    removeButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
