import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors, type Colors } from '@/constants/colors';

export default function HistoryContent() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.emptyText}>No workouts yet</Text>
      <Text style={styles.hintText}>Complete a workout to see it here</Text>
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bg,
      paddingHorizontal: 16,
    },
    emptyText: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    hintText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
  });
