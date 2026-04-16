import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
  Pressable,
  Modal,
  Keyboard,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

import { useColors, type Colors } from '@/constants/colors';
import { useMuscleGroupColors } from '@/constants/muscleGroupColors';
import { muscleGroups } from '@/constants/muscleGroups';
import { equipmentOptions } from '@/constants/equipment';
import { fonts } from '@/constants/typography';
import { insertCustomExercise } from '@/db/exercises';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd?: (id: number, name: string, muscleGroup: string) => void;
}

export default function AddExerciseModal({ visible, onClose, onAdd }: AddExerciseModalProps) {
  const colors = useColors();
  const mgColors = useMuscleGroupColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [newName, setNewName] = useState('');
  const [newMuscleGroup, setNewMuscleGroup] = useState<string>(muscleGroups[0]);
  const [newEquipment, setNewEquipment] = useState<string>(equipmentOptions[0]);
  const [shouldRender, setShouldRender] = useState(false);

  const backdropOpacity = useSharedValue(0);
  const slide = useSharedValue(SCREEN_HEIGHT);
  const keyboardHeight = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);

  // Track the keyboard ourselves. useAnimatedKeyboard doesn't fire mid-rise
  // inside a <Modal>, so we listen to keyboardWillShow/Hide and drive our own
  // shared value with the system-reported animation duration.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const duration = e.duration ?? 250;
      keyboardHeight.value = withTiming(e.endCoordinates.height, {
        duration,
        easing: Easing.out(Easing.quad),
      });
    });
    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      const duration = e.duration ?? 250;
      keyboardHeight.value = withTiming(0, {
        duration,
        easing: Easing.in(Easing.quad),
      });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeight]);

  // Mount on open, run close animation on hide
  useEffect(() => {
    if (visible) {
      setNewName('');
      setNewMuscleGroup(muscleGroups[0]);
      setNewEquipment(equipmentOptions[0]);
      setShouldRender(true);
    } else if (shouldRender) {
      Keyboard.dismiss();
      backdropOpacity.value = withTiming(0, { duration: 220 });
      slide.value = withTiming(
        SCREEN_HEIGHT,
        { duration: 260, easing: Easing.in(Easing.quad) },
        (finished) => {
          if (finished) runOnJS(setShouldRender)(false);
        }
      );
    }
  }, [visible, shouldRender, backdropOpacity, slide]);

  // Open animation: runs AFTER mount so we can focus the TextInput in the
  // same tick the sheet starts sliding. Focusing kicks keyboardWillShow,
  // which starts keyboardHeight animating in lockstep with the slide.
  useEffect(() => {
    if (shouldRender && visible) {
      inputRef.current?.focus();
      backdropOpacity.value = withTiming(0.4, { duration: 250 });
      slide.value = withTiming(0, {
        duration: 280,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [shouldRender, visible, backdropOpacity, slide]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slide.value - keyboardHeight.value }],
  }));

  const handleAdd = useCallback(() => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const id = insertCustomExercise(trimmed, newMuscleGroup, newEquipment);
    if (onAdd) {
      onAdd(id, trimmed, newMuscleGroup);
    } else {
      onClose();
    }
  }, [newName, newMuscleGroup, newEquipment, onAdd, onClose]);

  return (
    <Modal visible={shouldRender} animationType="none" transparent>
      <View style={styles.overlay}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
          <Animated.View style={sheetStyle}>
          <Pressable style={styles.content} onPress={Keyboard.dismiss}>
            <Text style={styles.title}>Custom Exercise</Text>

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Exercise name"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
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
              style={styles.chipRow}
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

            <View style={styles.buttons}>
              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.saveButton,
                  !newName.trim() && styles.saveButtonDisabled,
                ]}
                onPress={handleAdd}
                disabled={!newName.trim()}
              >
                <Text style={styles.saveButtonText}>Add</Text>
              </Pressable>
            </View>
          </Pressable>
          <View style={styles.bottomFill} />
          </Animated.View>
        </Pressable>
      </View>
    </Modal>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'black',
    },
    bottomFill: {
      backgroundColor: colors.bg,
      height: 1000,
      marginBottom: -1000,
    },
    content: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 32,
    },
    title: {
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
    buttons: {
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
