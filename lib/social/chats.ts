import { supabase } from '@/lib/supabase';
import type { ChatMessage, ChatSummary, Profile } from './types';

export async function listChats(currentUserId: string): Promise<ChatSummary[]> {
  const { data: chatRows, error } = await supabase
    .from('chats')
    .select('id, last_message_at, chat_members!inner(user_id, profiles(id, username, display_name, avatar_url, profile_color))')
    .order('last_message_at', { ascending: false });

  if (error) throw error;

  const chatIds = (chatRows ?? []).map((c: any) => c.id);
  const previews = await fetchPreviews(chatIds);

  return (chatRows ?? []).map((c: any) => {
    const otherMember = c.chat_members.find((m: any) => m.user_id !== currentUserId);
    const other = otherMember?.profiles ?? null;
    return {
      id: c.id,
      last_message_at: c.last_message_at,
      other: other as Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'profile_color'>,
      preview: previews[c.id] ?? null,
    };
  }).filter((c) => c.other != null);
}

async function fetchPreviews(chatIds: string[]): Promise<Record<string, string>> {
  if (chatIds.length === 0) return {};
  const { data, error } = await supabase
    .from('messages')
    .select('chat_id, body, created_at')
    .in('chat_id', chatIds)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    if (!(row.chat_id in out)) out[row.chat_id] = row.body;
  }
  return out;
}

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
