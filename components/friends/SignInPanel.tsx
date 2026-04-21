import { useCallback, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import AnimatedPressable from '@/components/AnimatedPressable';
import CheeseSlice from './CheeseSlice';

WebBrowser.maybeCompleteAuthSession();

type Mode = 'choose' | 'email';
type EmailMode = 'sign-in' | 'sign-up';

export default function SignInPanel() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>('choose');
  const [emailMode, setEmailMode] = useState<EmailMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const confirmInputRef = useRef<TextInput>(null);

  const handleAppleSignIn = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. See docs/SUPABASE.md.');
      return;
    }
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const redirectTo = Linking.createURL('auth-callback');

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (oauthError) throw oauthError;
      if (!data?.url) throw new Error('No OAuth URL returned by Supabase.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success' || !result.url) return;

      const parsed = Linking.parse(result.url);
      const code =
        (parsed.queryParams?.code as string | undefined) ??
        extractFromHash(result.url, 'code');
      if (!code) throw new Error('No auth code in callback URL.');

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await useAuthStore.getState().setSession(
          userData.user.id,
          userData.user.user_metadata?.full_name ?? null
        );
      }
    } catch (e: any) {
      setError(e?.message ?? 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  }, []);

  const handleEmailSubmit = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. See docs/SUPABASE.md.');
      return;
    }
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setError('Email and password are required.');
      return;
    }
    if (emailMode === 'sign-up' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (emailMode === 'sign-up' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (emailMode === 'sign-in') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (signInError) throw signInError;
        if (data.user) {
          await useAuthStore.getState().setSession(
            data.user.id,
            data.user.user_metadata?.full_name ?? null
          );
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmed,
          password,
        });
        if (signUpError) throw signUpError;
        if (data.session && data.user) {
          await useAuthStore.getState().setSession(
            data.user.id,
            data.user.user_metadata?.full_name ?? null
          );
        } else {
          setInfo('Check your inbox to confirm your email, then sign in.');
          setEmailMode('sign-in');
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch (e: any) {
      setError(e?.message ?? 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  }, [email, password, confirmPassword, emailMode]);

  const showChoose = mode === 'choose';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.illustration}>
          <CheeseSlice size={170} />
        </View>
        <Text style={styles.headline}>Join your crew</Text>
        <Text style={styles.body}>
          Climb the weekly leaderboard, cheer on your friends, and talk shop between sets.
        </Text>

        {showChoose ? (
          <>
            <AnimatedPressable
              onPress={handleAppleSignIn}
              disabled={busy}
              containerStyle={styles.buttonWrap}
              style={[styles.buttonApple, busy && styles.buttonDisabled]}
            >
              <Ionicons name="logo-apple" size={20} color={colors.isDark ? '#000' : '#fff'} />
              <Text style={styles.buttonAppleText}>
                {busy ? 'Signing in…' : 'Sign in with Apple'}
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() => {
                setMode('email');
                setError(null);
                setInfo(null);
              }}
              disabled={busy}
              containerStyle={styles.buttonWrap}
              style={styles.buttonOutlined}
            >
              <Ionicons name="mail-outline" size={20} color={colors.text} />
              <Text style={styles.buttonOutlinedText}>Continue with Email</Text>
            </AnimatedPressable>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
              editable={!busy}
            />
            <TextInput
              style={[styles.input, styles.inputPassword]}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              passwordRules=""
              value={password}
              onChangeText={setPassword}
              editable={!busy}
              onSubmitEditing={() => {
                if (emailMode === 'sign-up') confirmInputRef.current?.focus();
                else handleEmailSubmit();
              }}
              returnKeyType={emailMode === 'sign-in' ? 'go' : 'next'}
            />
            {emailMode === 'sign-up' && (
              <TextInput
                ref={confirmInputRef}
                style={[styles.input, styles.inputPassword]}
                placeholder="Confirm password"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                textContentType="password"
                autoComplete="password"
                passwordRules=""
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!busy}
                onSubmitEditing={handleEmailSubmit}
                returnKeyType="done"
              />
            )}

            <AnimatedPressable
              onPress={handleEmailSubmit}
              disabled={busy}
              containerStyle={styles.buttonWrap}
              style={[styles.buttonPrimary, busy && styles.buttonDisabled]}
            >
              <Text style={styles.buttonPrimaryText}>
                {busy
                  ? 'Please wait…'
                  : emailMode === 'sign-in'
                  ? 'Sign In'
                  : 'Create Account'}
              </Text>
            </AnimatedPressable>

            <View style={styles.linkRow}>
              <Pressable
                onPress={() => {
                  setEmailMode(emailMode === 'sign-in' ? 'sign-up' : 'sign-in');
                  setConfirmPassword('');
                  setError(null);
                  setInfo(null);
                }}
                disabled={busy}
                hitSlop={8}
              >
                <Text style={styles.link}>
                  {emailMode === 'sign-in'
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Sign in'}
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                setMode('choose');
                setError(null);
                setInfo(null);
              }}
              disabled={busy}
              hitSlop={8}
              style={styles.backRow}
            >
              <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          </>
        )}

        {info && <Text style={styles.info}>{info}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </KeyboardAvoidingView>
  );
}

function extractFromHash(url: string, key: string): string | undefined {
  const hashIndex = url.indexOf('#');
  if (hashIndex < 0) return undefined;
  const params = new URLSearchParams(url.slice(hashIndex + 1));
  return params.get(key) ?? undefined;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    flex: {
      flex: 1,
    },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    illustration: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    headline: {
      fontSize: 34,
      lineHeight: 40,
      fontFamily: fonts.bold,
      color: colors.text,
      textAlign: 'center',
      letterSpacing: -0.5,
    },
    body: {
      fontSize: 16,
      lineHeight: 22,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 24,
      paddingHorizontal: 8,
    },
    buttonWrap: {
      width: '100%',
    },
    buttonApple: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.isDark ? '#ffffff' : '#000000',
    },
    buttonAppleText: {
      color: colors.isDark ? '#000000' : '#ffffff',
      fontSize: 16,
      fontFamily: fonts.semiBold,
    },
    buttonOutlined: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 52,
      borderRadius: 14,
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    buttonOutlinedText: {
      color: colors.text,
      fontSize: 16,
      fontFamily: fonts.semiBold,
    },
    buttonPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.primary,
      marginTop: 4,
    },
    buttonPrimaryText: {
      color: colors.textOnPrimary,
      fontSize: 16,
      fontFamily: fonts.semiBold,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    input: {
      width: '100%',
      height: 52,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.bgCard,
      paddingHorizontal: 16,
      color: colors.text,
      fontSize: 16,
      fontFamily: fonts.regular,
    },
    inputPassword: {
      fontFamily: undefined,
    },
    linkRow: {
      alignItems: 'center',
      marginTop: 4,
    },
    link: {
      color: colors.primary,
      fontFamily: fonts.medium,
      fontSize: 14,
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginTop: 2,
    },
    backText: {
      color: colors.textSecondary,
      fontFamily: fonts.medium,
      fontSize: 14,
    },
    error: {
      color: colors.error,
      fontFamily: fonts.medium,
      fontSize: 13,
      textAlign: 'center',
    },
    info: {
      color: colors.success,
      fontFamily: fonts.medium,
      fontSize: 13,
      textAlign: 'center',
    },
  });
