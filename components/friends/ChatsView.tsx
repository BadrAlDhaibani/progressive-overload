import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import AnimatedPressable from '@/components/AnimatedPressable';
import ChatListItem from './ChatListItem';
import { listChats } from '@/lib/social/chats';
import type { ChatSummary } from '@/lib/social/types';
import { useAuthStore } from '@/store/useAuthStore';

export default function ChatsView() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const myId = useAuthStore((s) => s.userId);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async ({ isRefresh = false }: { isRefresh?: boolean } = {}) => {
    if (!myId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setChats(await listChats(myId));
    } catch (e: any) {
      setError(e?.message ?? 'Could not load chats.');
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [myId]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openChat = useCallback((chatId: string) => {
    router.push(`/chat/${chatId}`);
  }, [router]);

  return (
    <View style={styles.container}>
      <AnimatedPressable style={styles.newChatButton} onPress={() => router.push('/friends/add')}>
        <Ionicons name="add-circle" size={22} color={colors.primary} />
        <Text style={styles.newChatText}>Add Friends</Text>
      </AnimatedPressable>

      {error ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>{error}</Text>
        </View>
      ) : chats.length === 0 && !loading ? (
        <View style={styles.state}>
          <Text style={styles.stateTitle}>No chats yet</Text>
          <Text style={styles.stateText}>Add someone by their username to start a chat.</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ChatListItem chat={item} onPress={() => openChat(item.id)} />
          )}
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
    newChatButton: {
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
    newChatText: {
      fontSize: 15,
      fontFamily: fonts.semiBold,
      color: colors.primaryDark,
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    state: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 6,
    },
    stateTitle: {
      fontSize: 17,
      fontFamily: fonts.semiBold,
      color: colors.text,
    },
    stateText: {
      fontSize: 14,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
