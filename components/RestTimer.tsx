import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';

import AnimatedPressable from '@/components/AnimatedPressable';
import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { useTimerStore } from '@/store/useTimerStore';

const COLLAPSE_AFTER_MS = 3000;
const TICK_MS = 250;
const HAPTIC_WINDOW_MS = 1500;

function formatMmSs(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function RestTimer() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isRunning = useTimerStore((s) => s.isRunning);
  const endsAtMs = useTimerStore((s) => s.endsAtMs);
  const addSeconds = useTimerStore((s) => s.addSeconds);
  const cancel = useTimerStore((s) => s.cancel);

  const [now, setNow] = useState<number>(() => Date.now());
  const [mode, setMode] = useState<'compact' | 'expanded'>('compact');
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiredRef = useRef(false);

  // Reset expiry sentinel whenever a fresh timer starts.
  useEffect(() => {
    expiredRef.current = false;
    setMode('compact');
  }, [endsAtMs]);

  // Ticker — only while running.
  useEffect(() => {
    if (!isRunning || endsAtMs === null) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [isRunning, endsAtMs]);

  // Expiry handler — fires haptic only when the timer crosses zero in the
  // foreground. If we discover an already-expired timer (cold resume), skip the
  // haptic since the OS notification already alerted the user.
  useEffect(() => {
    if (!isRunning || endsAtMs === null) return;
    if (expiredRef.current) return;
    if (now < endsAtMs) return;

    expiredRef.current = true;
    const overdueMs = Date.now() - endsAtMs;
    if (overdueMs < HAPTIC_WINDOW_MS) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    void cancel();
  }, [now, isRunning, endsAtMs, cancel]);

  // Auto-collapse after inactivity in expanded mode.
  useEffect(() => {
    if (mode !== 'expanded') return;
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = setTimeout(() => setMode('compact'), COLLAPSE_AFTER_MS);
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, [mode, now]);

  if (!isRunning || endsAtMs === null) return null;
  const remainingSeconds = (endsAtMs - Date.now()) / 1000;
  if (remainingSeconds <= 0) return null;

  const label = formatMmSs(remainingSeconds);

  const handleExpand = () => {
    Haptics.selectionAsync();
    setMode('expanded');
  };

  const handleAdjust = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void addSeconds(delta);
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void cancel();
  };

  return (
    <Animated.View
      entering={SlideInDown.easing(Easing.out(Easing.cubic)).duration(220)}
      exiting={SlideOutDown.easing(Easing.in(Easing.cubic)).duration(180)}
      style={styles.wrapper}
    >
      {mode === 'compact' ? (
        <AnimatedPressable
          containerStyle={styles.pillContainer}
          style={styles.pill}
          onPress={handleExpand}
          accessibilityRole="button"
          accessibilityLabel={`Rest timer ${label}, tap to adjust`}
        >
          <View style={styles.pillInner}>
            <Ionicons name="timer-outline" size={18} color={colors.text} />
            <Text style={styles.countText}>{label}</Text>
            <AnimatedPressable
              containerStyle={styles.iconBtnContainer}
              style={styles.iconBtn}
              onPress={handleDismiss}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Dismiss rest timer"
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </AnimatedPressable>
          </View>
        </AnimatedPressable>
      ) : (
        <View style={styles.pill}>
          <View style={styles.pillInner}>
            <AnimatedPressable
              containerStyle={styles.adjustBtnContainer}
              style={styles.adjustBtn}
              onPress={() => handleAdjust(-30)}
              accessibilityRole="button"
              accessibilityLabel="Subtract 30 seconds"
            >
              <Text style={styles.adjustText}>−30s</Text>
            </AnimatedPressable>
            <Text style={styles.countText}>{label}</Text>
            <AnimatedPressable
              containerStyle={styles.adjustBtnContainer}
              style={styles.adjustBtn}
              onPress={() => handleAdjust(30)}
              accessibilityRole="button"
              accessibilityLabel="Add 30 seconds"
            >
              <Text style={styles.adjustText}>+30s</Text>
            </AnimatedPressable>
            <AnimatedPressable
              containerStyle={styles.iconBtnContainer}
              style={styles.iconBtn}
              onPress={handleDismiss}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Dismiss rest timer"
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </AnimatedPressable>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    pillContainer: {
      // outer Animated.View from AnimatedPressable
    },
    pill: {
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    pillInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    countText: {
      flex: 1,
      textAlign: 'center',
      fontSize: 20,
      fontFamily: fonts.semiBold,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    adjustBtnContainer: {},
    adjustBtn: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: colors.bgMuted,
    },
    adjustText: {
      fontSize: 14,
      fontFamily: fonts.semiBold,
      color: colors.text,
    },
    iconBtnContainer: {},
    iconBtn: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
    },
  });
