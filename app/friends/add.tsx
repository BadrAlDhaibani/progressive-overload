import { useCallback, useMemo, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import ScreenHeader from '@/components/friends/ScreenHeader';
import AnimatedPressable from '@/components/AnimatedPressable';
import { useAuthStore } from '@/store/useAuthStore';

export default function AddFriendsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const username = useAuthStore((s) => s.profile?.username);
  const [copied, setCopied] = useState(false);

  const shareUrl = username
    ? `provolone://friends/new?u=${encodeURIComponent(username)}`
    : null;

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    await Clipboard.setStringAsync(shareUrl);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [shareUrl]);

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await Share.share({ message: shareUrl });
    } catch {
      // User dismissed the sheet or Share threw — nothing to do.
    }
  }, [shareUrl]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScreenHeader title="Add Friends" />
      <View style={styles.body}>
        <AnimatedPressable
          onPress={() => router.push('/friends/new')}
          containerStyle={styles.choiceWrap}
          style={styles.choice}
        >
          <Ionicons name="search" size={20} color={colors.primary} />
          <Text style={styles.choiceText}>Search by username</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </AnimatedPressable>

        {username ? (
          <View style={styles.shareCard}>
            <Text style={styles.shareLabel}>Your link</Text>
            <Text style={styles.shareHandle}>@{username}</Text>
            <Text style={styles.shareUrl} numberOfLines={1}>
              {shareUrl}
            </Text>
            <Text style={styles.shareHint}>
              Send this to a friend. Opening it on their phone sends you a friend request.
            </Text>
            <View style={styles.shareButtons}>
              <AnimatedPressable
                onPress={handleCopy}
                containerStyle={styles.shareButtonWrap}
                style={styles.shareButtonOutlined}
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={18}
                  color={colors.text}
                />
                <Text style={styles.shareButtonOutlinedText}>
                  {copied ? 'Copied' : 'Copy'}
                </Text>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={handleShare}
                containerStyle={styles.shareButtonWrap}
                style={styles.shareButtonPrimary}
              >
                <Ionicons
                  name="share-outline"
                  size={18}
                  color={colors.textOnPrimary}
                />
                <Text style={styles.shareButtonPrimaryText}>Share</Text>
              </AnimatedPressable>
            </View>
          </View>
        ) : (
          <View style={styles.shareCard}>
            <Text style={styles.shareHint}>
              Sign in and claim a username to share your link.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    body: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 24,
      gap: 16,
    },
    choiceWrap: {
      width: '100%',
    },
    choice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      height: 52,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.bgCard,
      paddingHorizontal: 16,
    },
    choiceText: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      fontFamily: fonts.semiBold,
    },
    shareCard: {
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.bgCard,
      padding: 16,
      gap: 6,
    },
    shareLabel: {
      fontSize: 13,
      fontFamily: fonts.medium,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    shareHandle: {
      fontSize: 22,
      fontFamily: fonts.bold,
      color: colors.text,
    },
    shareUrl: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: colors.textMuted,
    },
    shareHint: {
      fontSize: 13,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginTop: 4,
    },
    shareButtons: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    shareButtonWrap: {
      flex: 1,
    },
    shareButtonOutlined: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 46,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: 'transparent',
    },
    shareButtonOutlinedText: {
      color: colors.text,
      fontSize: 15,
      fontFamily: fonts.semiBold,
    },
    shareButtonPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 46,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    shareButtonPrimaryText: {
      color: colors.textOnPrimary,
      fontSize: 15,
      fontFamily: fonts.semiBold,
    },
  });
