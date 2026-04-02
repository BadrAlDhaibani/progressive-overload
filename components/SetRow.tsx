import { memo, useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

import { useColors, type Colors } from '@/constants/colors';

interface SetRowProps {
  localId: string;
  setOrder: number;
  weight: number | null;
  reps: number | null;
  isComplete: boolean;
  onUpdateSet: (localId: string, weight: number | null, reps: number | null) => void;
  onCompleteSet: (localId: string) => void;
}

function SetRow({
  localId,
  setOrder,
  weight,
  reps,
  isComplete,
  onUpdateSet,
  onCompleteSet,
}: SetRowProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [weightText, setWeightText] = useState(weight != null ? String(weight) : '');
  const [repsText, setRepsText] = useState(reps != null ? String(reps) : '');

  const handleWeightEnd = useCallback(() => {
    const trimmed = weightText.trim();
    const parsed = trimmed === '' ? null : Number(trimmed);
    const value = parsed !== null && isNaN(parsed) ? weight : parsed;
    onUpdateSet(localId, value, reps);
  }, [weightText, localId, weight, reps, onUpdateSet]);

  const handleRepsEnd = useCallback(() => {
    const trimmed = repsText.trim();
    const parsed = trimmed === '' ? null : Number(trimmed);
    const value = parsed !== null && isNaN(parsed) ? reps : parsed;
    onUpdateSet(localId, weight, value);
  }, [repsText, localId, weight, reps, onUpdateSet]);

  const handleComplete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCompleteSet(localId);
  }, [localId, onCompleteSet]);

  return (
    <View style={[styles.row, isComplete && styles.rowComplete]}>
      <Text style={[styles.setNumber, styles.setNumberCol]}>{setOrder}</Text>

      <View style={styles.weightCol}>
        <TextInput
          style={[styles.input, isComplete && styles.inputComplete]}
          value={weightText}
          onChangeText={setWeightText}
          onEndEditing={handleWeightEnd}
          keyboardType="numeric"
          selectTextOnFocus
          placeholder="—"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.repsCol}>
        <TextInput
          style={[styles.input, isComplete && styles.inputComplete]}
          value={repsText}
          onChangeText={setRepsText}
          onEndEditing={handleRepsEnd}
          keyboardType="numeric"
          selectTextOnFocus
          placeholder="—"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <Pressable
        onPress={handleComplete}
        hitSlop={4}
        style={styles.checkCol}
      >
        <Ionicons
          name={isComplete ? 'checkmark-circle' : 'ellipse-outline'}
          size={28}
          color={isComplete ? colors.primary : colors.border}
        />
      </Pressable>
    </View>
  );
}

export default memo(SetRow);

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    rowComplete: {
      backgroundColor: colors.primaryLight,
    },
    setNumberCol: {
      width: 40,
    },
    setNumber: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    weightCol: {
      flex: 1,
      alignItems: 'center',
    },
    repsCol: {
      flex: 1,
      alignItems: 'center',
    },
    checkCol: {
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      minHeight: 44,
      width: '80%',
      paddingHorizontal: 8,
    },
    inputComplete: {
      borderColor: colors.primaryLight,
      backgroundColor: colors.primaryLight,
    },
  });
