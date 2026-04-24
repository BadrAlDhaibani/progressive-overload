import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import AnimatedPressable from '@/components/AnimatedPressable';
import Avatar from './Avatar';
import { removeFriend } from '@/lib/social/friends';
import { startDirectChat } from '@/lib/social/chats';
import type { Friend } from '@/lib/social/types';

interface Props {
  friend: Friend;
  onChange: () => void;
}

export default function FriendRow({ friend, onChange }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const label = friend.profile.display_name ?? friend.profile.username;

  const handlePress = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const chatId = await startDirectChat(friend.profile.username);
      router.push(`/chat/${chatId}`);
    } catch (e: any) {
      Alert.alert('Could not open chat', e?.message ?? 'Try again.');
    } finally {
      setBusy(false);
    }
  }, [busy, friend.profile.username, router]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      `Remove @${friend.profile.username}?`,
      "You'll stop seeing each other on the leaderboard.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(friend.friendship_id);
              onChange();
            } catch (e: any) {
              Alert.alert('Could not remove', e?.message ?? 'Try again.');
            }
          },
        },
      ]
    );
  }, [friend.friendship_id, friend.profile.username, onChange]);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={styles.row}
    >
      <Avatar
        seed={friend.profile.id}
        label={label}
        size={44}
        color={friend.profile.profile_color}
      />
      <View style={styles.middle}>
        {friend.profile.display_name ? (
          <Text style={styles.name} numberOfLines={1}>
            {friend.profile.display_name}
          </Text>
        ) : null}
        <Text
          style={friend.profile.display_name ? styles.handle : styles.name}
          numberOfLines={1}
        >
          @{friend.profile.username}
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={colors.textMuted} />
      ) : null}
    </AnimatedPressable>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.bgCard,
      borderRadius: 14,
      marginBottom: 8,
    },
    middle: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontSize: 15,
      fontFamily: fonts.semiBold,
      color: colors.text,
    },
    handle: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: colors.textMuted,
      marginTop: 2,
    },
  });
