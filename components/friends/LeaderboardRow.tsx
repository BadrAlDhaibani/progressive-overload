import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import Avatar, { avatarColorFor } from './Avatar';
import type { LeaderboardMetric, LeaderboardRow as Row } from '@/lib/social/types';
import { formatMetric, metricUnit } from './format';

interface Props {
  row: Row;
  rank: number;
  metric: LeaderboardMetric;
  isSelf: boolean;
}

export default function LeaderboardRow({ row, rank, metric, isSelf }: Props) {
  const colors = useColors();
  const tint = avatarColorFor(row.user_id, row.profile_color);
  const styles = useMemo(
    () => createStyles(colors, isSelf, rank, tint),
    [colors, isSelf, rank, tint]
  );

  const Body = (
    <>
      <Text style={styles.rank}>{rank}</Text>
      <Avatar seed={row.user_id} label={row.display_name ?? row.username} size={40} color={row.profile_color} />
      <View style={styles.middle}>
        <Text style={styles.username} numberOfLines={1}>
          @{row.username}
          {isSelf && <Text style={styles.you}>  you</Text>}
        </Text>
        <Text style={styles.unit}>{metricUnit(metric)}</Text>
      </View>
      <Text style={styles.value}>{formatMetric(row, metric)}</Text>
    </>
  );

  if (!isSelf) {
    return (
      <LinearGradient
        colors={[`${tint}3a`, `${tint}1a`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.row}
      >
        {Body}
      </LinearGradient>
    );
  }

  return <View style={styles.row}>{Body}</View>;
}

const createStyles = (colors: Colors, isSelf: boolean, rank: number, tint: string) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: isSelf ? `${tint}22` : 'transparent',
      borderRadius: 14,
      marginBottom: 8,
      borderWidth: isSelf ? 1 : 0,
      borderColor: isSelf ? colors.primary : 'transparent',
    },
    rank: {
      width: 24,
      textAlign: 'center',
      fontSize: 15,
      fontFamily: fonts.semiBold,
      color: rank === 1 ? colors.primaryDark : colors.textSecondary,
    },
    middle: {
      flex: 1,
    },
    username: {
      fontSize: 15,
      fontFamily: fonts.semiBold,
      color: colors.text,
    },
    you: {
      fontSize: 11,
      color: colors.primary,
      fontFamily: fonts.medium,
    },
    unit: {
      fontSize: 12,
      fontFamily: fonts.regular,
      color: colors.textMuted,
      marginTop: 2,
    },
    value: {
      fontSize: 17,
      fontFamily: fonts.bold,
      color: colors.text,
    },
  });
