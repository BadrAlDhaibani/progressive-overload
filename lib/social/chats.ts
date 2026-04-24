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
