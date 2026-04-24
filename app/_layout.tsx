import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from '@/db/database';
import { parseNotificationKind } from '@/lib/notifications';
import { useAuthStore } from '@/store/useAuthStore';
import { useTabNavStore } from '@/store/useTabNavStore';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();
initDatabase();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      useAuthStore.getState().init();
    }
  }, [loaded]);

  useEffect(() => {
    // Handle cold-start notification taps.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response && parseNotificationKind(response) === 'workout_start') {
        useTabNavStore.getState().requestTab('friends', 'leaderboard');
      }
    });
    // Warm taps.
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (parseNotificationKind(response) === 'workout_start') {
          useTabNavStore.getState().requestTab('friends', 'leaderboard');
        }
      },
    );
    return () => subscription.remove();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="workout/[id]"
            options={{
              presentation: 'fullScreenModal',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="workout/add-exercise"
            options={{
              presentation: 'modal',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="workout/summary"
            options={{
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="template/edit"
            options={{
              presentation: 'fullScreenModal',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="template/pick-exercise"
            options={{
              presentation: 'modal',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="exercise/[id]"
            options={{
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="exercise/new"
            options={{ presentation: 'modal', gestureEnabled: true }}
          />
          <Stack.Screen
            name="chat/[id]"
            options={{ gestureEnabled: true }}
          />
          <Stack.Screen
            name="settings/username"
            options={{ presentation: 'modal', gestureEnabled: true }}
          />
          <Stack.Screen
            name="friends/add"
            options={{ presentation: 'modal', gestureEnabled: true }}
          />
          <Stack.Screen
            name="friends/new"
            options={{ presentation: 'modal', gestureEnabled: true }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
