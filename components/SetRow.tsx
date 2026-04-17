import { memo, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, TextInput, View, Pressable, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

const DELETE_THRESHOLD = 96;
const SWIPE_OUT_DURATION = 180;
const SNAP_BACK_DURATION = 200;

interface SetRowProps {
  localId: string;
  setOrder: number;
  weight: number | null;
  reps: number | null;
  isComplete: boolean;
  onUpdateSet: (localId: string, weight: number | null, reps: number | null) => void;
  onCompleteSet: (localId: string) => void;
  onRemoveSet: (localId: string) => void;
}

function SetRow({
  localId,
  setOrder,
  weight,
  reps,
  isComplete,
  onUpdateSet,
  onCompleteSet,
  onRemoveSet,
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
    // Flush current text values to store before completing,
    // in case onEndEditing hasn't fired yet (user tapped complete
    // while a TextInput was still focused).
    const wTrimmed = weightText.trim();
    const wParsed = wTrimmed === '' ? null : Number(wTrimmed);
    const w = wParsed !== null && isNaN(wParsed) ? weight : wParsed;

    const rTrimmed = repsText.trim();
    const rParsed = rTrimmed === '' ? null : Number(rTrimmed);
    const r = rParsed !== null && isNaN(rParsed) ? reps : rParsed;

    onUpdateSet(localId, w, r);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCompleteSet(localId);
  }, [localId, weightText, repsText, weight, reps, onUpdateSet, onCompleteSet]);

  const checkScale = useSharedValue(1);
  const prevComplete = useRef(isComplete);

  useEffect(() => {
    if (isComplete && !prevComplete.current) {
      checkScale.value = withSequence(
        withTiming(1.3, { duration: 100 }),
        withTiming(1.0, { duration: 150 })
      );
    }
    prevComplete.current = isComplete;
  }, [isComplete, checkScale]);

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const translateX = useSharedValue(0);
  const containerWidth = useSharedValue(0);
  const armed = useSharedValue(false);

  const fireThresholdHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const commitDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRemoveSet(localId);
  }, [localId, onRemoveSet]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-10, 10])
        .onUpdate((e) => {
          'worklet';
          const next = Math.min(0, e.translationX);
          translateX.value = next;
          if (-next >= DELETE_THRESHOLD && !armed.value) {
            armed.value = true;
            runOnJS(fireThresholdHaptic)();
          } else if (-next < DELETE_THRESHOLD && armed.value) {
            armed.value = false;
          }
        })
        .onEnd(() => {
          'worklet';
          if (-translateX.value >= DELETE_THRESHOLD) {
            const exitTarget = -(containerWidth.value || 600);
            translateX.value = withTiming(
              exitTarget,
              { duration: SWIPE_OUT_DURATION, easing: Easing.in(Easing.cubic) },
              (finished) => {
                if (finished) runOnJS(commitDelete)();
              }
            );
          } else {
            translateX.value = withTiming(0, {
              duration: SNAP_BACK_DURATION,
              easing: Easing.out(Easing.cubic),
            });
            armed.value = false;
          }
        }),
    [translateX, containerWidth, armed, fireThresholdHaptic, commitDelete]
  );

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const iconStyle = useAnimatedStyle(() => {
    const raw = -translateX.value / DELETE_THRESHOLD;
    const p = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    return {
      opacity: p,
      transform: [{ scale: 0.6 + 0.4 * p }],
    };
  });

  const onContainerLayout = useCallback(
    (e: LayoutChangeEvent) => {
      containerWidth.value = e.nativeEvent.layout.width;
    },
    [containerWidth]
  );

  return (
    <View style={styles.swipeContainer} onLayout={onContainerLayout}>
      <View style={styles.deleteBackground} pointerEvents="none">
        <Animated.View style={[styles.iconWrap, iconStyle]}>
          <Ionicons name="trash-outline" size={22} color={colors.textOnPrimary} />
        </Animated.View>
      </View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={rowStyle}>
          <View style={[styles.row, isComplete ? styles.rowComplete : styles.rowDefault]}>
            <Text style={[styles.setNumber, styles.setNumberCol]}>{setOrder}</Text>

            <View style={styles.weightCol}>
              <TextInput
                style={[styles.input, isComplete && styles.inputComplete]}
                value={weightText}
                onChangeText={setWeightText}
                onEndEditing={handleWeightEnd}
                editable={!isComplete}
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
                editable={!isComplete}
                keyboardType="numeric"
                selectTextOnFocus
                placeholder="—"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <Pressable
              onPress={handleComplete}
              hitSlop={8}
              style={styles.checkCol}
            >
              <Animated.View style={checkAnimStyle}>
                <Ionicons
                  name={isComplete ? 'checkmark-circle' : 'ellipse-outline'}
                  size={28}
                  color={isComplete ? colors.primary : colors.border}
                />
              </Animated.View>
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>
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
    rowDefault: {
      backgroundColor: colors.bgCard,
    },
    rowComplete: {
      backgroundColor: colors.primaryLight,
    },
    setNumberCol: {
      width: 40,
    },
    setNumber: {
      fontSize: 14,
      fontFamily: fonts.semiBold,
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
      fontFamily: fonts.bold,
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
    swipeContainer: {
      position: 'relative',
      backgroundColor: colors.error,
      overflow: 'hidden',
    },
    deleteBackground: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
    iconWrap: {
      paddingRight: 24,
    },
  });
