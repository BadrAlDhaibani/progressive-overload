import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';

import { useColors, type Colors } from '@/constants/colors';

export default function HomeContent() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Proverload</Text>
      <Text style={styles.subtitle}>Track your progress. Beat your last set.</Text>
      <Pressable
        style={({ pressed }) => [
          styles.startButton,
          pressed && styles.startButtonPressed,
        ]}
      >
        <Text style={styles.startButtonText}>Start Workout</Text>
      </Pressable>
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
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 32,
    },
    startButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 48,
      borderRadius: 12,
    },
    startButtonPressed: {
      backgroundColor: colors.primaryDark,
    },
    startButtonText: {
      color: '#ffffff',
      fontSize: 17,
      fontWeight: '600',
    },
  });
