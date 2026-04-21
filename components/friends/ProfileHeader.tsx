import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import AnimatedPressable from '@/components/AnimatedPressable';
import Avatar from './Avatar';
import { useAuthStore } from '@/store/useAuthStore';

export default function ProfileHeader() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const profile = useAuthStore((s) => s.profile);
  const router = useRouter();

  if (!profile) return null;

  return (
    <AnimatedPressable
      onPress={() => router.push('/settings/username')}
      style={styles.row}
    >
      <Avatar seed={profile.id} label={profile.username} size={34} />
      <Text style={styles.username} numberOfLines={1}>@{profile.username}</Text>
    </AnimatedPressable>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgMuted,
      borderRadius: 20,
      paddingLeft: 4,
      paddingRight: 12,
      paddingVertical: 4,
      gap: 8,
      maxWidth: 170,
    },
    username: {
      fontSize: 13,
      fontFamily: fonts.semiBold,
      color: colors.text,
      flexShrink: 1,
    },
  });
