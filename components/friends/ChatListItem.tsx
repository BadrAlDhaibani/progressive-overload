import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import AnimatedPressable from '@/components/AnimatedPressable';
import Avatar from './Avatar';
import type { ChatSummary } from '@/lib/social/types';
import { formatRelativeTime } from './format';

interface Props {
  chat: ChatSummary;
  onPress: () => void;
}

export default function ChatListItem({ chat, onPress }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const label = chat.other.display_name ?? chat.other.username;

  return (
    <AnimatedPressable onPress={onPress} style={styles.row}>
      <Avatar seed={chat.other.id} label={label} size={48} />
      <View style={styles.middle}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>@{chat.other.username}</Text>
          <Text style={styles.time}>{formatRelativeTime(chat.last_message_at)}</Text>
        </View>
        <Text style={styles.preview} numberOfLines={1}>
          {chat.preview ?? 'Say hi 👋'}
        </Text>
      </View>
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
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    name: {
      fontSize: 15,
      fontFamily: fonts.semiBold,
      color: colors.text,
      flexShrink: 1,
    },
    time: {
      fontSize: 12,
      fontFamily: fonts.regular,
      color: colors.textMuted,
    },
    preview: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
