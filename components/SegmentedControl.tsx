import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: object;
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: Props<T>) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [trackWidth, setTrackWidth] = useState(0);
  const count = options.length;
  const segmentWidth = trackWidth > 0 ? (trackWidth - 8) / count : 0;
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const translate = useSharedValue(0);

  useEffect(() => {
    translate.value = withTiming(activeIndex * segmentWidth, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [activeIndex, segmentWidth, translate]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translate.value }],
    width: segmentWidth,
  }));

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  const onPress = useCallback(
    (next: T) => {
      if (next === value) return;
      Haptics.selectionAsync();
      onChange(next);
    },
    [onChange, value]
  );

  return (
    <View style={[styles.track, style]} onLayout={onLayout}>
      {segmentWidth > 0 && <Animated.View style={[styles.thumb, thumbStyle]} />}
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            style={styles.segment}
            onPress={() => onPress(opt.value)}
            hitSlop={8}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: colors.bgMuted,
      borderRadius: 12,
      padding: 4,
      height: 40,
      alignItems: 'center',
      overflow: 'hidden',
    },
    thumb: {
      position: 'absolute',
      top: 4,
      bottom: 4,
      left: 4,
      borderRadius: 9,
      backgroundColor: colors.bg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: colors.isDark ? 0 : 0.08,
      shadowRadius: 2,
      elevation: colors.isDark ? 0 : 1,
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    label: {
      fontSize: 13,
      fontFamily: fonts.medium,
      color: colors.textSecondary,
    },
    labelActive: {
      color: colors.text,
      fontFamily: fonts.semiBold,
    },
  });
