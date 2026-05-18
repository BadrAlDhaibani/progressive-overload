import { supabase } from '@/lib/supabase';
import type { ChatMessage, Profile } from './types';

export async function startDirectChat(username: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_direct_chat', {
    target_username: username,
  });
  if (error) throw error;
  return data as string;
}

export async function fetchMessages(chatId: string, limit = 50): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as ChatMessage[]).reverse();
}

export async function sendMessage(chatId: string, senderId: string, body: string): Promise<ChatMessage> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Message is empty.');
  const { data, error } = await supabase
    .from('messages')
    .insert({ chat_id: chatId, sender_id: senderId, body: trimmed })
    .select('*')
    .single();
  if (error) throw error;
  return data as ChatMessage;
}

export async function getChatPartner(chatId: string, currentUserId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('chat_members')
    .select('profiles(id, username, display_name, avatar_url, profile_color, created_at, updated_at)')
    .eq('chat_id', chatId);
  if (error) throw error;
  const other = (data ?? [])
    .map((r: any) => r.profiles)
    .find((p: Profile | null) => p && p.id !== currentUserId);
  return (other as Profile) ?? null;
}

export function subscribeToMessages(chatId: string, onMessage: (m: ChatMessage) => void) {
  const channel = supabase
    .channel(`chat:${chatId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      (payload) => onMessage(payload.new as ChatMessage)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function markChatRead(chatId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_chat_read', { _chat_id: chatId });
  if (error) throw error;
}

export async function getUnreadChatCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('get_unread_chat_counts');
  if (error) throw error;
  const map: Record<string, number> = {};
  for (const row of (data ?? []) as Array<{ partner_id: string; unread_count: number }>) {
    if (row.unread_count > 0) map[row.partner_id] = row.unread_count;
  }
  return map;
}

// RLS scopes the realtime stream to messages in chats the caller is a member
// of, so a single unfiltered subscription on the messages table is sufficient.
// The hardcoded topic must be deduped at the data layer because more than one
// component subscribes concurrently (tab layout + friends list).
let sharedMessagesChannel: ReturnType<typeof supabase.channel> | null = null;
const messagesListeners = new Set<(m: ChatMessage) => void>();

export function subscribeToAllMyMessages(onInsert: (m: ChatMessage) => void) {
  messagesListeners.add(onInsert);
  if (!sharedMessagesChannel) {
    sharedMessagesChannel = supabase
      .channel('messages:all')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as ChatMessage;
          for (const l of messagesListeners) l(msg);
        }
      )
      .subscribe();
  }

  return () => {
    messagesListeners.delete(onInsert);
    if (messagesListeners.size === 0 && sharedMessagesChannel) {
      supabase.removeChannel(sharedMessagesChannel);
      sharedMessagesChannel = null;
    }
  };
}
