import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { useMotusStore } from '../store/useStore';
import MotusScreenTime from '../../modules/motus-screen-time/src/MotusScreenTimeModule';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { lockExpirationTime, setLockExpiration, token, loadState } = useMotusStore();
  const appState = useRef(AppState.currentState);
  const hasHandledNotification = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    loadState().then(() => setIsReady(true));
  }, [loadState]);

  useEffect(() => {
    if (!isReady) return;

    // First check if there's a notification to handle
    if (
      token &&
      lastNotificationResponse &&
      lastNotificationResponse.notification.request.identifier !== hasHandledNotification.current
    ) {
      hasHandledNotification.current = lastNotificationResponse.notification.request.identifier;
      if (lockExpirationTime) {
        MotusScreenTime.blockApps();
        setLockExpiration(null);
        router.replace('/(tabs)');
      } else {
        router.replace('/intercept');
      }
      return;
    }

    // Normal auth routing
    const inAuthGroup = (segments as string[])[0] === 'auth';
    const isIndex = (segments as string[]).length === 0;

    if (token) {
      if (isIndex || inAuthGroup) {
        router.replace('/(tabs)');
      }
    } else {
      if (!isIndex && !inAuthGroup) {
        router.replace('/');
      }
    }
  }, [isReady, token, segments, lastNotificationResponse, lockExpirationTime]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      // Only handle notifications when app is ready and user is authenticated
      if (!isReady || !token) return;
      
      if (lockExpirationTime) {
        MotusScreenTime.blockApps();
        setLockExpiration(null);
        router.push('/(tabs)');
      } else {
        router.push('/intercept');
      }
    });
    return () => subscription.remove();
  }, [isReady, token, lockExpirationTime]);

  useEffect(() => {
    const checkExpiration = () => {
      if (lockExpirationTime && Date.now() >= lockExpirationTime) {
        MotusScreenTime.blockApps();
        setLockExpiration(null);
      }
    };

    checkExpiration();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        checkExpiration();
      }
      appState.current = nextAppState;
    });

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

  if (!isReady) {
    return <View style={styles.container} />;
  }

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
