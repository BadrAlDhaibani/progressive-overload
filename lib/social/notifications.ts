import { supabase } from '@/lib/supabase';

export type NotificationPrefs = {
  send_enabled: boolean;
  receive_enabled: boolean;
};

const DEFAULTS: NotificationPrefs = {
  send_enabled: true,
  receive_enabled: true,
};

export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const { data, error } = await supabase
    .from('notification_prefs')
    .select('send_enabled, receive_enabled')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULTS;
  return {
    send_enabled: data.send_enabled ?? true,
    receive_enabled: data.receive_enabled ?? true,
  };
}

export async function setNotificationPref(
  userId: string,
  field: 'send_enabled' | 'receive_enabled',
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('notification_prefs')
    .upsert({ user_id: userId, [field]: enabled }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function setFriendMute(friendshipId: string, muted: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_friend_mute', {
    friendship_id: friendshipId,
    muted,
  });
  if (error) throw error;
}
