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
import { useRouter } from 'expo-router';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import ScreenHeader from '@/components/friends/ScreenHeader';
import AnimatedPressable from '@/components/AnimatedPressable';
import { useAuthStore } from '@/store/useAuthStore';
import { updateUsername } from '@/lib/social/profiles';
import { isValidUsername, normalizeUsername } from '@/lib/social/username';

export default function UsernameScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const profile = useAuthStore((s) => s.profile);
  const refresh = useAuthStore((s) => s.refreshProfile);
  const signOut = useAuthStore((s) => s.signOut);

  const [value, setValue] = useState(profile?.username ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dirty = normalizeUsername(value) !== (profile?.username ?? '');
  const canSave = dirty && isValidUsername(normalizeUsername(value)) && !busy;

  const handleSave = useCallback(async () => {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      await updateUsername(profile.id, value);
      await refresh();
      router.back();
    } catch (e: any) {
      setError(e?.message ?? 'Could not save.');
    } finally {
      setBusy(false);
    }
  }, [profile, refresh, router, value]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader
        title="Username"
        rightLabel="Save"
        onRightPress={handleSave}
        disabled={!canSave}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          <Text style={styles.label}>Your username</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.prefix}>@</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={(t) => {
                setValue(t);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              maxLength={24}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>
          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <Text style={styles.hint}>3–24 chars. Letters, numbers, and underscores.</Text>
          )}

          <View style={styles.spacer} />

          <AnimatedPressable
            onPress={() => {
              signOut();
              router.back();
            }}
            style={styles.signOutRow}
          >
            <Text style={styles.signOutText}>Sign out</Text>
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
      flex: 1,
    },
    label: {
      fontSize: 13,
      fontFamily: fonts.medium,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
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
      marginTop: 8,
    },
    hint: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: colors.textMuted,
      marginTop: 8,
    },
    spacer: {
      flex: 1,
    },
    signOutRow: {
      marginBottom: 24,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.bgMuted,
      alignItems: 'center',
    },
    signOutText: {
      color: colors.error,
      fontFamily: fonts.semiBold,
      fontSize: 15,
    },
  });
