import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import ScreenHeader from '@/components/friends/ScreenHeader';
import AnimatedPressable from '@/components/AnimatedPressable';
import { sendFriendRequest } from '@/lib/social/friends';
import { normalizeUsername } from '@/lib/social/username';

function humanizeError(message: string): string {
  switch (message) {
    case 'not authenticated':
      return 'Sign in to send a friend request.';
    case 'user not found':
      return 'No user with that username.';
    case 'cannot friend yourself':
      return "You can't friend yourself.";
    case 'already friends':
      return "You're already friends.";
    case 'request already sent':
      return 'You already sent them a request.';
    case 'pending request from this user':
      return 'They already sent you a request — accept it from your Friends tab.';
    default:
      return message || 'Could not send request.';
  }
}

export default function NewFriendRequestScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { u } = useLocalSearchParams<{ u?: string }>();
  const hasPrefill = Boolean(u);
  const [value, setValue] = useState(u ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    const username = normalizeUsername(value);
    if (!username) {
      setError('Enter a username.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendFriendRequest(username);
      setSentTo(username);
    } catch (e: any) {
      setError(humanizeError(e?.message ?? ''));
    } finally {
      setBusy(false);
    }
  }, [value]);

  if (sentTo) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <ScreenHeader title="Friend request" />
        <View style={styles.sentBody}>
          <View style={styles.sentIconWrap}>
            <Ionicons name="checkmark" size={32} color={colors.textOnPrimary} />
          </View>
          <Text style={styles.sentTitle}>Request sent</Text>
          <Text style={styles.sentHint}>
            Waiting for @{sentTo} to accept. You'll see them on your leaderboard once they do.
          </Text>
          <AnimatedPressable
            onPress={() => router.back()}
            containerStyle={styles.sentCta}
          >
            <View style={styles.ctaInner}>
              <Text style={styles.ctaText}>Done</Text>
            </View>
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader title="Add friend" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          <Text style={styles.label}>Username</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.prefix}>@</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={(t) => {
                setValue(t);
                setError(null);
              }}
              placeholder="their_username"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={!hasPrefill}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <Text style={styles.hint}>
            They'll get a pending request they can accept from their Friends tab.
          </Text>

          <AnimatedPressable
            onPress={handleSubmit}
            containerStyle={styles.cta}
            disabled={busy || value.trim().length === 0}
          >
            <View
              style={[
                styles.ctaInner,
                (busy || value.trim().length === 0) && styles.ctaDisabled,
              ]}
            >
              <Text style={styles.ctaText}>{busy ? 'Sending…' : 'Send request'}</Text>
            </View>
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    flex: {
      flex: 1,
    },
    body: {
      paddingHorizontal: 16,
      paddingTop: 24,
      gap: 8,
    },
    label: {
      fontSize: 13,
      fontFamily: fonts.medium,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgMuted,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 52,
      gap: 4,
    },
    prefix: {
      fontSize: 17,
      fontFamily: fonts.semiBold,
      color: colors.textSecondary,
    },
    input: {
      flex: 1,
      fontSize: 17,
      fontFamily: fonts.medium,
      color: colors.text,
    },
    error: {
      color: colors.error,
      fontFamily: fonts.medium,
      fontSize: 13,
    },
    hint: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: colors.textMuted,
      marginTop: 4,
    },
    cta: {
      marginTop: 24,
      borderRadius: 12,
    },
    ctaInner: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    ctaDisabled: {
      backgroundColor: colors.textMuted,
    },
    ctaText: {
      fontSize: 16,
      fontFamily: fonts.semiBold,
      color: colors.textOnPrimary,
    },
    sentBody: {
      paddingHorizontal: 16,
      paddingTop: 48,
      gap: 12,
    },
    sentIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      alignSelf: 'center',
    },
    sentTitle: {
      fontSize: 22,
      fontFamily: fonts.bold,
      color: colors.text,
      textAlign: 'center',
    },
    sentHint: {
      fontSize: 14,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 16,
    },
    sentCta: {
      marginTop: 24,
      borderRadius: 12,
    },
  });
