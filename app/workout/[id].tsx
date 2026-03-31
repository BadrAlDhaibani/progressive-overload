import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors, type Colors } from '@/constants/colors';

export default function WorkoutScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Workout</Text>
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
    },
    text: {
      fontSize: 17,
      color: colors.textSecondary,
    },
  });
