import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { cardShadow } from '@/constants/shadows';
import Avatar from './Avatar';
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
  const styles = useMemo(() => createStyles(colors, isSelf, rank), [colors, isSelf, rank]);

  const Body = (
    <>
      <Text style={styles.rank}>{rank}</Text>
      <Avatar seed={row.user_id} label={row.display_name ?? row.username} size={40} />
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

  if (rank === 1) {
    return (
      <LinearGradient
        colors={[colors.primaryLight, colors.bgCard]}
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

const createStyles = (colors: Colors, isSelf: boolean, rank: number) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: isSelf ? colors.primaryLight : colors.bgCard,
      borderRadius: 14,
      marginBottom: 8,
      borderWidth: isSelf ? 1 : 0,
      borderColor: isSelf ? colors.primary : 'transparent',
      ...(rank === 1 ? cardShadow(colors) : {}),
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
