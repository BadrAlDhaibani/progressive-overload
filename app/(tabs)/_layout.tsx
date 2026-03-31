import { useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors, type Colors } from '@/constants/colors';
import HomeContent from '@/components/screens/HomeContent';
import HistoryContent from '@/components/screens/HistoryContent';
import ExercisesContent from '@/components/screens/ExercisesContent';

type TabConfig = {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  Component: React.ComponentType;
};

const tabs: TabConfig[] = [
  { title: 'Home', icon: 'home-outline', Component: HomeContent },
  { title: 'History', icon: 'time-outline', Component: HistoryContent },
  { title: 'Exercises', icon: 'barbell-outline', Component: ExercisesContent },
];

export default function TabLayout() {
  const pagerRef = useRef<PagerView>(null);
  const isTabPressing = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const insets = useSafeAreaInsets();
  const colors = useColors();
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
    isTabPressing.current = true;
    setActiveIndex(index);
    pagerRef.current?.setPage(index);
  }, []);

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top, backgroundColor: colors.bg }} />

      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageScroll={onPageScroll}
        onPageSelected={onPageSelected}
      >
        {tabs.map((tab, index) => (
          <View key={index} style={styles.page}>
            <tab.Component />
          </View>
        ))}
      </PagerView>

      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          const tint = isActive ? colors.primary : colors.textMuted;
          return (
            <Pressable
              key={index}
              style={styles.tabItem}
              onPress={() => onTabPress(index)}
            >
              <Ionicons name={tab.icon} size={24} color={tint} />
              <Text style={[styles.tabLabel, { color: tint }]}>{tab.title}</Text>
            </Pressable>
          );
        })}
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
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: 8,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
    },
    tabLabel: {
      fontSize: 10,
      marginTop: 4,
    },
  });
