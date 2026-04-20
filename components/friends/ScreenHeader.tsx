import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

interface Props {
  title: string;
  rightLabel?: string;
  onRightPress?: () => void;
  disabled?: boolean;
}

export default function ScreenHeader({ title, rightLabel, onRightPress, disabled }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  return (
    <View style={styles.bar}>
      <Pressable hitSlop={12} onPress={() => router.back()} style={styles.left}>
        <Ionicons name="chevron-back" size={26} color={colors.primary} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.right}>
        {rightLabel && (
          <Pressable hitSlop={12} onPress={onRightPress} disabled={disabled}>
            <Text style={[styles.rightLabel, disabled && styles.rightDisabled]}>
              {rightLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    bar: {
      height: 44,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.bg,
    },
    left: {
      minWidth: 60,
      alignItems: 'flex-start',
    },
    right: {
      minWidth: 60,
      alignItems: 'flex-end',
    },
    title: {
      flex: 1,
      textAlign: 'center',
      fontSize: 17,
      fontFamily: fonts.semiBold,
      color: colors.text,
    },
    rightLabel: {
      fontSize: 15,
      fontFamily: fonts.semiBold,
      color: colors.primary,
    },
    rightDisabled: {
      color: colors.textMuted,
    },
  });
