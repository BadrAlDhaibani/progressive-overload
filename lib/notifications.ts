import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';

// Foreground behaviour: show the banner + list entry, no sound or badge.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    // Back-compat for older SDK type shapes that still expect `shouldShowAlert`.
    shouldShowAlert: true,
  }),
});

let currentToken: string | null = null;

export async function registerForPushNotifications(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (!Device.isDevice) return;
  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return;

    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
        ?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('expo-notifications: no EAS projectId in app config');
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;

    const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          expo_token: token,
          user_id: userId,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'expo_token' },
      );
    if (error) {
      console.warn('push_tokens upsert failed', error.message);
      return;
    }
    currentToken = token;
  } catch (e) {
    console.warn('registerForPushNotifications threw', e);
  }
}

// Removes this device's token only; other installations signed in as the same
// user keep receiving pushes.
export async function unregisterPushToken(): Promise<void> {
  if (!isSupabaseConfigured || !currentToken) return;
  try {
    await supabase.from('push_tokens').delete().eq('expo_token', currentToken);
  } catch (e) {
    console.warn('unregisterPushToken threw', e);
  }
  currentToken = null;
}

export type PushNotificationKind = 'workout_start';

export function parseNotificationKind(
  response: Notifications.NotificationResponse,
): PushNotificationKind | null {
  const raw = response.notification.request.content.data?.kind;
  return raw === 'workout_start' ? 'workout_start' : null;
}
