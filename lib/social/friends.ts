import { supabase } from '@/lib/supabase';
import type { Friend, FriendRequest, FriendProfile } from './types';

const PROFILE_COLS = 'id, username, display_name, avatar_url, profile_color';

export async function listFriends(currentUserId: string): Promise<Friend[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(
      `id, created_at, accepted_at, requester_id, recipient_id,
       requester:profiles!requester_id(${PROFILE_COLS}),
       recipient:profiles!recipient_id(${PROFILE_COLS})`
    )
    .eq('status', 'accepted');
  if (error) throw error;

  return (data ?? [])
    .map((row: any) => {
      const isRequester = row.requester_id === currentUserId;
      const other: FriendProfile | null = isRequester ? row.recipient : row.requester;
      if (!other) return null;
      return {
        friendship_id: row.id,
        since: row.accepted_at ?? row.created_at,
        profile: other,
      } as Friend;
    })
    .filter((f): f is Friend => f !== null);
}

async function listPending(
  currentUserId: string,
  direction: 'incoming' | 'outgoing'
): Promise<FriendRequest[]> {
  const column = direction === 'incoming' ? 'recipient_id' : 'requester_id';
  const joinAlias = direction === 'incoming' ? 'requester' : 'recipient';
  const joinColumn = direction === 'incoming' ? 'requester_id' : 'recipient_id';

  const { data, error } = await supabase
    .from('friendships')
    .select(`id, created_at, ${joinAlias}:profiles!${joinColumn}(${PROFILE_COLS})`)
    .eq('status', 'pending')
    .eq(column, currentUserId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? [])
    .map((row: any) => {
      const other: FriendProfile | null = row[joinAlias];
      if (!other) return null;
      return {
        id: row.id,
        direction,
        created_at: row.created_at,
        other,
      } as FriendRequest;
    })
    .filter((r): r is FriendRequest => r !== null);
}

export function listIncomingRequests(currentUserId: string): Promise<FriendRequest[]> {
  return listPending(currentUserId, 'incoming');
}

export function listOutgoingRequests(currentUserId: string): Promise<FriendRequest[]> {
  return listPending(currentUserId, 'outgoing');
}

export async function sendFriendRequest(username: string): Promise<string> {
  const { data, error } = await supabase.rpc('send_friend_request', {
    target_username: username,
  });
  if (error) throw error;
  return data as string;
}

export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  // RLS filters out rows where the caller isn't the recipient. PostgREST
  // doesn't error on zero-row updates, so force a row back and throw if empty.
  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', friendshipId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Request no longer available.');
}

export async function declineOrCancelRequest(friendshipId: string): Promise<void> {
  const { data, error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Request no longer available.');
}

export async function removeFriend(friendshipId: string): Promise<void> {
  const { data, error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Friend no longer available.');
}

export function subscribeToFriendships(userId: string, onChange: () => void) {
  // RLS on friendships restricts rows to those where auth.uid() is requester
  // or recipient, so a single unfiltered subscription is sufficient — realtime
  // applies the same RLS policy to the broadcast stream.
  const channel = supabase
    .channel(`friendships:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'friendships' },
      () => onChange()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
