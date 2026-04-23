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

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import ScreenHeader from '@/components/friends/ScreenHeader';
import AnimatedPressable from '@/components/AnimatedPressable';
import { startDirectChat } from '@/lib/social/chats';
import { normalizeUsername } from '@/lib/social/username';

export default function NewChatScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { u } = useLocalSearchParams<{ u?: string }>();
  const hasPrefill = Boolean(u);
  const [value, setValue] = useState(u ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = useCallback(async () => {
    const username = normalizeUsername(value);
    if (!username) {
      setError('Enter a username.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const chatId = await startDirectChat(username);
      router.replace(`/chat/${chatId}`);
    } catch (e: any) {
      setError(e?.message ?? 'Could not start chat.');
    } finally {
      setBusy(false);
    }
  }, [router, value]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader title="New chat" />
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
            Ask your friend for their username from their Friends tab.
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
              <Text style={styles.ctaText}>{busy ? 'Starting…' : 'Start chat'}</Text>
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
  });
