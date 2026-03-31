import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors, type Colors } from '@/constants/colors';

export default function ExercisesContent() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exercise Library</Text>
      <Text style={styles.hintText}>Your exercises will appear here</Text>
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
    title: {
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
