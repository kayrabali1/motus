import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { useMotusStore } from '../store/useStore';
import MotusScreenTime from '../../modules/motus-screen-time/src/MotusScreenTimeModule';

export default function RootLayout() {
  const router = useRouter();
  const { lockExpirationTime, setLockExpiration } = useMotusStore();
  const appState = useRef(AppState.currentState);
  const hasHandledNotification = useRef<string | null>(null);

  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (
      lastNotificationResponse &&
      lastNotificationResponse.notification.request.identifier !== hasHandledNotification.current
    ) {
      hasHandledNotification.current = lastNotificationResponse.notification.request.identifier;
      if (lockExpirationTime) {
        MotusScreenTime.blockApps();
        setLockExpiration(null);
        router.push('/(tabs)');
      } else {
        router.push('/camera');
      }
    }
  }, [lastNotificationResponse, lockExpirationTime, router, setLockExpiration]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      // Check if we are currently in an unlocked countdown
      if (lockExpirationTime) {
        MotusScreenTime.blockApps();
        setLockExpiration(null);
        router.push('/(tabs)');
      } else {
        // Otherwise, it's the Shield Notification asking to start the challenge
        router.push('/camera');
      }
    });
    return () => subscription.remove();
  }, [router, lockExpirationTime, setLockExpiration]);

  useEffect(() => {
    const checkExpiration = () => {
      if (lockExpirationTime && Date.now() >= lockExpirationTime) {
        MotusScreenTime.blockApps();
        setLockExpiration(null);
      }
    };

    // Check immediately when layout mounts
    checkExpiration();

    // Check whenever app comes to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        checkExpiration();
      }
      appState.current = nextAppState;
    });

    // Also set a failsafe timeout while the app is running
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (lockExpirationTime && Date.now() < lockExpirationTime) {
      timeoutId = setTimeout(() => {
        checkExpiration();
      }, lockExpirationTime - Date.now());
    }

    return () => {
      subscription.remove();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [lockExpirationTime, setLockExpiration]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: '#000000' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="intercept" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
