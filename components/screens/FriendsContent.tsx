import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import AnimatedScreen from '@/components/AnimatedScreen';
import SegmentedControl from '@/components/SegmentedControl';
import LeaderboardView from '@/components/friends/LeaderboardView';
import ChatsView from '@/components/friends/ChatsView';
import SignInPanel from '@/components/friends/SignInPanel';
import ProfileHeader from '@/components/friends/ProfileHeader';
import { useAuthStore } from '@/store/useAuthStore';

type Tab = 'leaderboard' | 'chats';

export default function FriendsContent() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tab, setTab] = useState<Tab>('leaderboard');

  const status = useAuthStore((s) => s.status);
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    if (status === 'loading') init();
  }, [init, status]);

  if (status === 'loading') {
    return (
      <AnimatedScreen>
        <View style={styles.center} />
      </AnimatedScreen>
    );
  }

  if (status === 'signed-out') {
    return (
      <AnimatedScreen>
        <SignInPanel />
      </AnimatedScreen>
    );
  }

  return (
    <AnimatedScreen>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Friends</Text>
        <ProfileHeader />
      </View>

      <View style={styles.switcherWrap}>
        <SegmentedControl<Tab>
          options={[
            { value: 'leaderboard', label: 'Leaderboard' },
            { value: 'chats', label: 'Chats' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      <Animated.View key={tab} entering={FadeIn.duration(200)} style={styles.panel}>
        {tab === 'leaderboard' ? <LeaderboardView /> : <ChatsView />}
      </Animated.View>
    </AnimatedScreen>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerBlock: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontSize: 28,
      fontFamily: fonts.bold,
      color: colors.text,
    },
    switcherWrap: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 12,
    },
    panel: {
      flex: 1,
    },
  });
