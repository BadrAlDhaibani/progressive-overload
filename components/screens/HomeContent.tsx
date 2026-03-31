import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';

import { useColors, type Colors } from '@/constants/colors';
import { getAllExercises } from '@/db/exercises';
import { getAllTemplates } from '@/db/templates';

export default function HomeContent() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // DEBUG: remove after verification
  const exerciseCount = useMemo(() => getAllExercises().length, []);
  const templateCount = useMemo(() => getAllTemplates().length, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Proverload</Text>
      <Text style={styles.subtitle}>Track your progress. Beat your last set.</Text>
      {/* DEBUG: remove after verification */}
      <Text style={styles.debugText}>
        {exerciseCount} exercises, {templateCount} templates
      </Text>
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
      marginBottom: 8,
    },
    // DEBUG: remove after verification
    debugText: {
      fontSize: 13,
      color: colors.textMuted,
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
