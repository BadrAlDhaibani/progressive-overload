import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import AnimatedPressable from '@/components/AnimatedPressable';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { BAR_OPTIONS, PLATE_SIZES, computeBarbellTotal } from '@/utils/plateMath';

const initialCounts: Record<number, number> = Object.fromEntries(
  PLATE_SIZES.map((p) => [p, 0])
);

export default function PlateCalcScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { localId } = useLocalSearchParams<{ localId?: string }>();

  const [barWeight, setBarWeight] = useState<number>(45);
  const [counts, setCounts] = useState<Record<number, number>>(initialCounts);

  const { total, perSideWeight } = useMemo(
    () => computeBarbellTotal({ barWeight, platesPerSide: counts }),
    [barWeight, counts]
  );

  useEffect(() => {
    if (!localId) {
      router.back();
    }
  }, [localId]);

  const handleBarChange = useCallback((value: number) => {
    Haptics.selectionAsync();
    setBarWeight(value);
  }, []);

  const handleInc = useCallback((plate: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCounts((c) => ({ ...c, [plate]: (c[plate] ?? 0) + 1 }));
  }, []);

  const handleDec = useCallback((plate: number) => {
    setCounts((c) => {
      const current = c[plate] ?? 0;
      if (current === 0) return c;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return { ...c, [plate]: current - 1 };
    });
  }, []);

  const handleUse = useCallback(() => {
    if (!localId) {
      router.back();
      return;
    }
    const target = useWorkoutStore.getState().sets[localId];
    if (!target) {
      router.back();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    useWorkoutStore.getState().updateSet(localId, total, target.reps);
    router.back();
  }, [localId, total]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Plate Calculator</Text>
        <AnimatedPressable
          onPress={() => router.back()}
          hitSlop={8}
          containerStyle={styles.closeButton}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </AnimatedPressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionLabel}>BAR</Text>
        <View style={styles.barRow}>
          {BAR_OPTIONS.map((bar) => {
            const active = barWeight === bar;
            return (
              <AnimatedPressable
                key={bar}
                onPress={() => handleBarChange(bar)}
                hitSlop={4}
                containerStyle={styles.barChipWrap}
              >
                <View style={[styles.barChip, active && styles.barChipActive]}>
                  <Text style={[styles.barChipText, active && styles.barChipTextActive]}>
                    {bar === 0 ? 'None' : `${bar} lb`}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, styles.platesLabel]}>PLATES (PER SIDE)</Text>
        <View style={styles.plateList}>
          {PLATE_SIZES.map((plate, index) => {
            const count = counts[plate] ?? 0;
            const decDisabled = count === 0;
            return (
              <View key={plate}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.plateRow}>
                  <Text style={styles.plateLabel}>{String(plate)} lb</Text>
                  <View style={styles.stepper}>
                    <AnimatedPressable
                      onPress={() => handleDec(plate)}
                      hitSlop={6}
                      disabled={decDisabled}
                      containerStyle={[
                        styles.stepBtn,
                        decDisabled && styles.stepBtnDisabled,
                      ]}
                    >
                      <Ionicons name="remove" size={18} color={colors.text} />
                    </AnimatedPressable>
                    <Text style={styles.plateCount}>{count}</Text>
                    <AnimatedPressable
                      onPress={() => handleInc(plate)}
                      hitSlop={6}
                      containerStyle={styles.stepBtn}
                    >
                      <Ionicons name="add" size={18} color={colors.text} />
                    </AnimatedPressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.totalBlock}>
          <Text style={styles.totalNumber}>{String(total)}</Text>
          <Text style={styles.totalUnit}>lb total</Text>
          <Text style={styles.totalSub}>
            {String(perSideWeight)} lb per side · bar {String(barWeight)}
          </Text>
        </View>

        <AnimatedPressable onPress={handleUse} containerStyle={styles.cta}>
          <View style={styles.ctaInner}>
            <Text style={styles.ctaText}>Use this weight</Text>
          </View>
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    root: {
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
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    sectionLabel: {
      fontSize: 11,
      fontFamily: fonts.semiBold,
      color: colors.textMuted,
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    barRow: {
      flexDirection: 'row',
      gap: 8,
    },
    barChipWrap: {
      borderRadius: 16,
    },
    barChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: colors.bgMuted,
    },
    barChipActive: {
      backgroundColor: colors.primary,
    },
    barChipText: {
      fontSize: 13,
      fontFamily: fonts.semiBold,
      color: colors.textSecondary,
    },
    barChipTextActive: {
      color: colors.textOnPrimary,
    },
    platesLabel: {
      marginTop: 20,
    },
    plateList: {
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      overflow: 'hidden',
    },
    plateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    plateLabel: {
      fontSize: 15,
      fontFamily: fonts.semiBold,
      color: colors.text,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    stepBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.bgMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBtnDisabled: {
      opacity: 0.4,
    },
    plateCount: {
      minWidth: 24,
      textAlign: 'center',
      fontSize: 17,
      fontFamily: fonts.bold,
      color: colors.text,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.divider,
      marginHorizontal: 14,
    },
    totalBlock: {
      marginTop: 28,
      alignItems: 'center',
    },
    totalNumber: {
      fontSize: 48,
      fontFamily: fonts.bold,
      color: colors.text,
      lineHeight: 56,
    },
    totalUnit: {
      fontSize: 13,
      fontFamily: fonts.semiBold,
      color: colors.textMuted,
      letterSpacing: 0.5,
      marginTop: -2,
    },
    totalSub: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginTop: 8,
    },
    cta: {
      marginTop: 'auto',
      marginBottom: 16,
      borderRadius: 12,
    },
    ctaInner: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    ctaText: {
      fontSize: 16,
      fontFamily: fonts.semiBold,
      color: colors.textOnPrimary,
    },
  });
