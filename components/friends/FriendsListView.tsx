import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';

import { useColors, type Colors } from '@/constants/colors';
import { TAB_BAR_SCROLL_PADDING } from '@/constants/layout';
import { fonts } from '@/constants/typography';
import AnimatedPressable from '@/components/AnimatedPressable';
import FriendRow from './FriendRow';
import PendingRequestRow from './PendingRequestRow';
import {
  listFriends,
  listIncomingRequests,
  subscribeToFriendships,
} from '@/lib/social/friends';
import type { Friend, FriendRequest } from '@/lib/social/types';
import { useAuthStore } from '@/store/useAuthStore';

export default function FriendsListView() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const myId = useAuthStore((s) => s.userId);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async ({ isRefresh = false }: { isRefresh?: boolean } = {}) => {
    if (!myId) return;
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const [nextFriends, nextIncoming] = await Promise.all([
        listFriends(myId),
        listIncomingRequests(myId),
      ]);
      setFriends(nextFriends);
      setIncoming(nextIncoming);
      setHasLoadedOnce(true);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load friends.');
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, [myId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!myId) return;
    const unsubscribe = subscribeToFriendships(myId, () => load());
    return () => {
      unsubscribe();
    };
  }, [myId, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => {
      const u = f.profile.username.toLowerCase();
      const d = (f.profile.display_name ?? '').toLowerCase();
      return u.includes(q) || d.includes(q);
    });
  }, [friends, query]);

  const hasAnyFriends = friends.length > 0;
  const hasIncoming = incoming.length > 0;
  const isEmpty = !hasAnyFriends && !hasIncoming && !error;

  if (!hasLoadedOnce) {
    return <View style={styles.container} />;
  }

  if (isEmpty) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="people-outline" size={36} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>No friends yet</Text>
        <Text style={styles.emptyHint}>
          Add a friend by username to get started.
        </Text>
        <AnimatedPressable
          onPress={() => router.push('/friends/add')}
          style={styles.emptyCta}
        >
          <Ionicons name="person-add" size={18} color={colors.textOnPrimary} />
          <Text style={styles.emptyCtaText}>Add Friends</Text>
        </AnimatedPressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AnimatedPressable
        style={styles.addButton}
        onPress={() => router.push('/friends/add')}
      >
        <Ionicons name="person-add" size={20} color={colors.primary} />
        <Text style={styles.addText}>Add Friends</Text>
      </AnimatedPressable>

      {hasAnyFriends && (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search friends"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      )}

      {hasIncoming && (
        <View style={styles.requestsCard}>
          <Text style={styles.requestsLabel}>
            Requests ({incoming.length})
          </Text>
          {incoming.map((req) => (
            <PendingRequestRow key={req.id} request={req} onChange={load} />
          ))}
        </View>
      )}

      {error ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>{error}</Text>
        </View>
      ) : filtered.length === 0 && query.length > 0 ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>No friends match "{query}".</Text>
        </View>
      ) : (
        <FlatList
          style={styles.flex}
          data={filtered}
          keyExtractor={(f) => f.friendship_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <FriendRow friend={item} onChange={load} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load({ isRefresh: true })}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    flex: {
      flex: 1,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: colors.primaryLight,
      borderRadius: 14,
    },
    addText: {
      fontSize: 15,
      fontFamily: fonts.semiBold,
      color: colors.primaryDark,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 12,
      paddingHorizontal: 14,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.bgMuted,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: fonts.medium,
      color: colors.text,
    },
    requestsCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.bgCard,
      gap: 12,
    },
    requestsLabel: {
      fontSize: 12,
      fontFamily: fonts.medium,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: TAB_BAR_SCROLL_PADDING,
      flexGrow: 1,
    },
    state: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 6,
    },
    stateText: {
      fontSize: 14,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingBottom: TAB_BAR_SCROLL_PADDING,
      gap: 10,
    },
    emptyIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: fonts.bold,
      color: colors.text,
    },
    emptyHint: {
      fontSize: 14,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    emptyCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 20,
      backgroundColor: colors.primary,
      borderRadius: 12,
    },
    emptyCtaText: {
      fontSize: 15,
      fontFamily: fonts.semiBold,
      color: colors.textOnPrimary,
    },
  });
