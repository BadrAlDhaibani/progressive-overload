import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import AnimatedPressable from '@/components/AnimatedPressable';
import Avatar from './Avatar';
import { acceptFriendRequest, declineOrCancelRequest } from '@/lib/social/friends';
import type { FriendRequest } from '@/lib/social/types';

interface Props {
  request: FriendRequest;
  onChange: () => void;
}

export default function PendingRequestRow({ request, onChange }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const label = request.other.display_name ?? request.other.username;

  const handleAccept = useCallback(async () => {
    if (busy) return;
    setBusy('accept');
    try {
      await acceptFriendRequest(request.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange();
    } catch (e: any) {
      Alert.alert('Could not accept', e?.message ?? 'Try again.');
    } finally {
      setBusy(null);
    }
  }, [busy, onChange, request.id]);

  const handleDecline = useCallback(async () => {
    if (busy) return;
    setBusy('decline');
    try {
      await declineOrCancelRequest(request.id);
      onChange();
    } catch (e: any) {
      Alert.alert('Could not decline', e?.message ?? 'Try again.');
    } finally {
      setBusy(null);
    }
  }, [busy, onChange, request.id]);

  return (
    <View style={styles.row}>
      <Avatar
        seed={request.other.id}
        label={label}
        size={40}
        color={request.other.profile_color}
      />
      <View style={styles.middle}>
        {request.other.display_name ? (
          <Text style={styles.name} numberOfLines={1}>{request.other.display_name}</Text>
        ) : null}
        <Text
          style={request.other.display_name ? styles.handle : styles.name}
          numberOfLines={1}
        >
          @{request.other.username}
        </Text>
      </View>
      <View style={styles.actions}>
        <AnimatedPressable
          onPress={handleDecline}
          style={styles.declineBtn}
          disabled={busy !== null}
        >
          <Text style={styles.declineText}>
            {busy === 'decline' ? '…' : 'Decline'}
          </Text>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={handleAccept}
          style={styles.acceptBtn}
          disabled={busy !== null}
        >
          <Text style={styles.acceptText}>
            {busy === 'accept' ? '…' : 'Accept'}
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    middle: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontSize: 14,
      fontFamily: fonts.semiBold,
      color: colors.text,
    },
    handle: {
      fontSize: 12,
      fontFamily: fonts.regular,
      color: colors.textMuted,
      marginTop: 1,
    },
    actions: {
      flexDirection: 'row',
      gap: 6,
    },
    declineBtn: {
      paddingHorizontal: 12,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    declineText: {
      fontSize: 13,
      fontFamily: fonts.semiBold,
      color: colors.text,
    },
    acceptBtn: {
      paddingHorizontal: 14,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    acceptText: {
      fontSize: 13,
      fontFamily: fonts.semiBold,
      color: colors.textOnPrimary,
    },
  });
