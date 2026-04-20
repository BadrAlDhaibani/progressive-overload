import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import ScreenHeader from '@/components/friends/ScreenHeader';
import MessageBubble from '@/components/friends/MessageBubble';
import MessageInput from '@/components/friends/MessageInput';
import {
  fetchMessages,
  getChatPartner,
  sendMessage,
  subscribeToMessages,
} from '@/lib/social/chats';
import type { ChatMessage, Profile } from '@/lib/social/types';
import { useAuthStore } from '@/store/useAuthStore';

export default function ChatScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = id as string;
  const myId = useAuthStore((s) => s.userId) ?? '';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partner, setPartner] = useState<Profile | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!chatId || !myId) return;
    let cancelled = false;
    (async () => {
      const [m, p] = await Promise.all([
        fetchMessages(chatId),
        getChatPartner(chatId, myId),
      ]);
      if (cancelled) return;
      setMessages(m);
      setPartner(p);
    })();
    const unsubscribe = subscribeToMessages(chatId, (m) => {
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [chatId, myId]);

  const handleSend = useCallback(
    async (body: string) => {
      if (!myId || !chatId) return;
      const optimistic: ChatMessage = {
        id: `tmp_${Date.now()}`,
        chat_id: chatId,
        sender_id: myId,
        body,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      try {
        const saved = await sendMessage(chatId, myId, body);
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
    },
    [chatId, myId]
  );

  useEffect(() => {
    if (messages.length === 0) return;
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenHeader title={partner ? `@${partner.username}` : 'Chat'} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={listRef}
          style={styles.flex}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const next = messages[index + 1];
            const showTail = !next || next.sender_id !== item.sender_id;
            return (
              <MessageBubble
                body={item.body}
                isMine={item.sender_id === myId}
                showTail={showTail}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>Say hi 👋</Text>
            </View>
          }
        />
        <MessageInput onSend={handleSend} />
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
    listContent: {
      paddingTop: 12,
      paddingBottom: 8,
      flexGrow: 1,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    emptyTitle: {
      fontSize: 17,
      fontFamily: fonts.semiBold,
      color: colors.text,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
  });
