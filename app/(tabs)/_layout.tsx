import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PagerView from 'react-native-pager-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { useColors, type Colors } from '@/constants/colors';
import HomeContent from '@/components/screens/HomeContent';
import HistoryContent from '@/components/screens/HistoryContent';
import ExercisesContent from '@/components/screens/ExercisesContent';
import FriendsContent from '@/components/screens/FriendsContent';
import AnimatedPressable from '@/components/AnimatedPressable';
import { useTabNavStore, tabNameToIndex } from '@/store/useTabNavStore';

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
              return (
                <AnimatedPressable
                  key={index}
                  containerStyle={styles.tabItem}
                  style={styles.tabItemInner}
                  onPress={() => onTabPress(index)}
                  accessibilityLabel={tab.title}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <Ionicons name={tab.icon} size={26} color={tint} />
                </AnimatedPressable>
              );
            })}
          </BlurView>
        </View>
      </View>
    </View>
  );
}

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
      height: 56,
      paddingHorizontal: 8,
      borderRadius: 28,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
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
  });
