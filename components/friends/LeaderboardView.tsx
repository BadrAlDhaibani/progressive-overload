import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import SegmentedControl from '@/components/SegmentedControl';
import LeaderboardRow from './LeaderboardRow';
import { METRIC_OPTIONS, metricValue } from './format';
import { fetchLeaderboard } from '@/lib/social/leaderboard';
import type { LeaderboardMetric, LeaderboardRow as Row } from '@/lib/social/types';
import { useAuthStore } from '@/store/useAuthStore';

export default function LeaderboardView() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [metric, setMetric] = useState<LeaderboardMetric>('workouts');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const myId = useAuthStore((s) => s.userId);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeaderboard(metric);
      setRows(data);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load leaderboard.');
    } finally {
      setLoading(false);
    }
  }, [metric]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sorted = useMemo(
    () => [...rows].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)),
    [rows, metric]
  );

  return (
    <View style={styles.container}>
      <View style={styles.metricWrap}>
        <SegmentedControl<LeaderboardMetric>
          options={METRIC_OPTIONS.map((o) => ({ value: o.value, label: o.shortLabel }))}
          value={metric}
          onChange={setMetric}
        />
      </View>

      {error ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>{error}</Text>
        </View>
      ) : sorted.length === 0 && !loading ? (
        <View style={styles.state}>
          <Text style={styles.stateTitle}>No activity this week yet</Text>
          <Text style={styles.stateText}>
            Finish a workout to appear on the board.
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.flex}
          data={sorted}
          keyExtractor={(row) => row.user_id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <LeaderboardRow
              row={item}
              rank={index + 1}
              metric={metric}
              isSelf={item.user_id === myId}
            />
          )}
        />
      )}
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    flex: {
      flex: 1,
    },
    metricWrap: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 32,
      flexGrow: 1,
    },
    state: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 6,
    },
    stateTitle: {
      fontSize: 17,
      fontFamily: fonts.semiBold,
      color: colors.text,
    },
    stateText: {
      fontSize: 14,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
