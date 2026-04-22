import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AVATAR_PALETTE, useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import ScreenHeader from '@/components/friends/ScreenHeader';
import AnimatedPressable from '@/components/AnimatedPressable';
import Avatar from '@/components/friends/Avatar';
import { useAuthStore } from '@/store/useAuthStore';
import { updateProfileColor, updateUsername } from '@/lib/social/profiles';
import { isValidUsername, normalizeUsername } from '@/lib/social/username';

const COLOR_OPTIONS: Array<{ key: string; color: string | null }> = [
  { key: 'default', color: null },
  ...AVATAR_PALETTE.map((c) => ({ key: c, color: c })),
];

export default function UsernameScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const profile = useAuthStore((s) => s.profile);
  const refresh = useAuthStore((s) => s.refreshProfile);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);

  const [value, setValue] = useState(profile?.username ?? '');
  const [error, setError] = useState<string | null>(null);
  const [savingBusy, setSavingBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [pendingColor, setPendingColor] = useState<string | null | undefined>(undefined);

  const busy = savingBusy || deleteBusy;

  const savedColor = profile?.profile_color ?? null;
  const currentColor = pendingColor !== undefined ? pendingColor : savedColor;
  const usernameDirty = normalizeUsername(value) !== (profile?.username ?? '');
  const colorDirty = pendingColor !== undefined && pendingColor !== savedColor;
  const usernameValid = !usernameDirty || isValidUsername(normalizeUsername(value));
  const canSave = (usernameDirty || colorDirty) && usernameValid && !busy;

  const handleSave = useCallback(async () => {
    if (!profile) return;
    setSavingBusy(true);
    setError(null);
    let usernameError: string | null = null;
    let colorError: string | null = null;
    try {
      if (usernameDirty) {
        try {
          await updateUsername(profile.id, value);
        } catch (e: any) {
          usernameError = e?.message ?? 'Could not save username.';
        }
      }
      if (colorDirty) {
        try {
          await updateProfileColor(profile.id, pendingColor ?? null);
        } catch (e: any) {
          colorError = e?.message ?? 'Please try again.';
        }
      }
      await refresh();
      if (usernameError) {
        setError(usernameError);
        if (colorError) Alert.alert('Could not save color', colorError);
        return;
      }
      if (colorError) {
        Alert.alert('Could not save color', colorError);
        return;
      }
      router.back();
    } finally {
      setSavingBusy(false);
    }
  }, [profile, refresh, router, value, usernameDirty, colorDirty, pendingColor]);

  const handlePickColor = useCallback((color: string | null) => {
    setPendingColor(color === savedColor ? undefined : color);
  }, [savedColor]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your profile, chats, messages, and leaderboard stats. Your local workout data stays on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleteBusy(true);
            try {
              await deleteAccount();
              router.back();
            } catch (e) {
              Alert.alert(
                'Could not delete account',
                e instanceof Error ? e.message : 'Please try again.',
              );
            } finally {
              setDeleteBusy(false);
            }
          },
        },
      ],
    );
  }, [deleteAccount, router]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader
        title="Account"
        rightLabel="Save"
        onRightPress={handleSave}
        disabled={!canSave}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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

            <View style={styles.colorSection}>
              <Text style={styles.label}>Profile color</Text>
              <View style={styles.previewRow}>
                <Avatar
                  seed={profile?.id ?? ''}
                  label={profile?.username}
                  size={56}
                  color={currentColor}
                />
              </View>
              <View style={styles.swatchRow}>
                {COLOR_OPTIONS.map(({ key, color }) => {
                  const isSelected = currentColor === color;
                  const isDefault = color === null;
                  return (
                    <AnimatedPressable
                      key={key}
                      onPress={() => handlePickColor(color)}
                      disabled={busy}
                      style={[styles.swatchWrap, isSelected && styles.swatchWrapSelected]}
                    >
                      <View
                        style={[
                          styles.swatch,
                          isDefault
                            ? styles.swatchDefault
                            : { backgroundColor: color as string },
                        ]}
                      />
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.spacer} />

            <AnimatedPressable
              onPress={() => {
                signOut();
                router.back();
              }}
              disabled={busy}
              style={styles.signOutRow}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={handleDeleteAccount}
              disabled={busy}
              style={styles.deleteAccountRow}
            >
              <Text style={styles.deleteAccountText}>Delete account</Text>
            </AnimatedPressable>
          </View>
        </TouchableWithoutFeedback>
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
    colorSection: {
      marginTop: 32,
    },
    previewRow: {
      alignItems: 'center',
      marginBottom: 16,
    },
    swatchRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    swatchWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2.5,
      borderColor: 'transparent',
    },
    swatchWrapSelected: {
      borderColor: colors.text,
    },
    swatch: {
      width: 30,
      height: 30,
      borderRadius: 15,
    },
    swatchDefault: {
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.textMuted,
      backgroundColor: 'transparent',
    },
    spacer: {
      flex: 1,
    },
    signOutRow: {
      marginBottom: 12,
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
    deleteAccountRow: {
      marginBottom: 24,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.error,
      backgroundColor: 'transparent',
      alignItems: 'center',
    },
    deleteAccountText: {
      color: colors.error,
      fontFamily: fonts.semiBold,
      fontSize: 15,
    },
  });
