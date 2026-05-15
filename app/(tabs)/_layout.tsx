import { Fragment, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PagerView from 'react-native-pager-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useColors, type Colors } from '@/constants/colors';
import HomeContent from '@/components/screens/HomeContent';
import HistoryContent from '@/components/screens/HistoryContent';
import ExercisesContent from '@/components/screens/ExercisesContent';
import FriendsContent from '@/components/screens/FriendsContent';
import AnimatedPressable from '@/components/AnimatedPressable';
import { useTabNavStore, tabNameToIndex } from '@/store/useTabNavStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { getUnreadChatCounts, subscribeToAllMyMessages } from '@/lib/social/chats';
import { createWorkout } from '@/db/workouts';

type TabConfig = {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  Component: React.ComponentType;
};

const tabs: TabConfig[] = [
  { title: 'Home', icon: 'home-outline', Component: HomeContent },
  { title: 'History', icon: 'time-outline', Component: HistoryContent },
  { title: 'Exercises', icon: 'barbell-outline', Component: ExercisesContent },
  { title: 'Friends', icon: 'people-outline', Component: FriendsContent },
];

export default function TabLayout() {
  const pagerRef = useRef<PagerView>(null);
  const isTabPressing = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const onPageScroll = useCallback((e: { nativeEvent: { position: number; offset: number } }) => {
    if (isTabPressing.current) return;
    const { position, offset } = e.nativeEvent;
    const newIndex = offset > 0.5 ? position + 1 : position;
    setActiveIndex(newIndex);
  }, []);

  const onPageSelected = useCallback((e: { nativeEvent: { position: number } }) => {
    setActiveIndex(e.nativeEvent.position);
    isTabPressing.current = false;
  }, []);

  const onTabPress = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    isTabPressing.current = true;
    setActiveIndex(index);
    pagerRef.current?.setPage(index);
  }, []);

  // Consume a pending tab request (e.g. from a notification tap).
  const pendingTab = useTabNavStore((s) => s.pendingTab);
  useEffect(() => {
    if (!pendingTab) return;
    const index = tabNameToIndex(pendingTab);
    isTabPressing.current = true;
    setActiveIndex(index);
    pagerRef.current?.setPage(index);
    useTabNavStore.getState().consumeTab();
  }, [pendingTab]);

  // Friends-tab unread dot. Only meaningful when signed in.
  const userId = useAuthStore((s) => s.userId);
  const [hasUnread, setHasUnread] = useState(false);

  const refreshUnread = useCallback(async () => {
    try {
      const counts = await getUnreadChatCounts();
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      setHasUnread(total > 0);
    } catch {
      // Silent — non-critical.
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setHasUnread(false);
      return;
    }
    refreshUnread();
    const unsubscribe = subscribeToAllMyMessages(() => refreshUnread());
    return () => {
      unsubscribe();
    };
  }, [userId, refreshUnread]);

  // Refetch when the user lands on Friends — reads will have fired and
  // server counts will have dropped.
  useEffect(() => {
    if (!userId) return;
    if (tabs[activeIndex]?.title === 'Friends') refreshUnread();
  }, [activeIndex, userId, refreshUnread]);

  // Global "start workout" FAB — start fresh, or resume the active session.
  const router = useRouter();
  const isWorkoutActive = useWorkoutStore((s) => s.isActive);
  const activeWorkoutId = useWorkoutStore((s) => s.workoutId);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  const onFabPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isWorkoutActive && activeWorkoutId !== null) {
      router.push(`/workout/${activeWorkoutId}`);
      return;
    }
    const id = createWorkout();
    startWorkout(id);
    router.push(`/workout/${id}`);
  }, [isWorkoutActive, activeWorkoutId, startWorkout, router]);

  return (
    <View style={styles.container}>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageScroll={onPageScroll}
        onPageSelected={onPageSelected}
      >
        {tabs.map((tab, index) => (
          <SafeAreaView key={index} style={styles.page} edges={['top']}>
            <tab.Component />
          </SafeAreaView>
        ))}
      </PagerView>

      <View
        pointerEvents="box-none"
        style={[styles.floatingWrapper, { bottom: Math.max(insets.bottom - 8, 8) }]}
      >
        <View style={styles.pillShadow}>
          <BlurView
            intensity={80}
            tint={colors.isDark ? 'dark' : 'light'}
            style={styles.pill}
          >
            {tabs.map((tab, index) => {
              const isActive = index === activeIndex;
              const tint = isActive ? colors.primary : colors.textMuted;
              const showUnreadDot = tab.title === 'Friends' && hasUnread && !isActive;
              return (
                <Fragment key={index}>
                  {index === 2 ? <View style={styles.fabSpacer} /> : null}
                  <AnimatedPressable
                    containerStyle={styles.tabItem}
                    style={styles.tabItemInner}
                    onPress={() => onTabPress(index)}
                    accessibilityLabel={tab.title}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                  >
                    <View style={styles.iconWrap}>
                      <Ionicons name={tab.icon} size={26} color={tint} />
                      {showUnreadDot ? <View style={styles.tabUnreadDot} /> : null}
                    </View>
                  </AnimatedPressable>
                </Fragment>
              );
            })}
          </BlurView>
        </View>

        <View style={styles.fabPositioner} pointerEvents="box-none">
          <AnimatedPressable
            onPress={onFabPress}
            containerStyle={[styles.fabShadow, !isWorkoutActive && styles.fabShadowInactive]}
            style={styles.fabPressable}
            accessibilityLabel={isWorkoutActive ? 'Resume workout' : 'Start workout'}
            accessibilityRole="button"
          >
            {isWorkoutActive ? (
              <LinearGradient
                colors={[colors.primaryMedium, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fabGradient}
              >
                <Ionicons name="play" size={30} color={colors.textOnPrimary} />
              </LinearGradient>
            ) : (
              <View style={styles.fabInactive}>
                <Ionicons name="add" size={30} color={colors.primary} />
              </View>
            )}
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );
}

const PILL_HEIGHT = 56;
const FAB_SIZE = 64;
const FAB_SPACER_WIDTH = FAB_SIZE + 12;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    pager: {
      flex: 1,
    },
    page: {
      flex: 1,
    },
    floatingWrapper: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    pillShadow: {
      borderRadius: 28,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    pill: {
      flexDirection: 'row',
      height: PILL_HEIGHT,
      paddingHorizontal: 8,
      borderRadius: 28,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    fabSpacer: {
      width: FAB_SPACER_WIDTH,
      height: PILL_HEIGHT,
    },
    fabPositioner: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: (PILL_HEIGHT - FAB_SIZE) / 2,
      alignItems: 'center',
    },
    fabShadow: {
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
      shadowColor: colors.primary,
      shadowOpacity: colors.isDark ? 0.5 : 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 10,
    },
    fabShadowInactive: {
      shadowOpacity: colors.isDark ? 0.2 : 0.15,
    },
    fabPressable: {
      width: '100%',
      height: '100%',
      borderRadius: FAB_SIZE / 2,
      overflow: 'hidden',
    },
    fabGradient: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fabInactive: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bg,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: FAB_SIZE / 2,
    },
    tabItem: {
      width: 56,
      height: 56,
    },
    tabItemInner: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrap: {
      width: 26,
      height: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabUnreadDot: {
      position: 'absolute',
      top: -1,
      right: -3,
      width: 9,
      height: 9,
      borderRadius: 4.5,
      backgroundColor: colors.primary,
      borderWidth: 1.5,
      borderColor: colors.bg,
    },
  });
