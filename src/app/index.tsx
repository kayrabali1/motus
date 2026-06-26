import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useMotusStore } from '../store/useStore';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const { token, loadState } = useMotusStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadState().then(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!loading && token) {
      router.replace('/(tabs)');
    }
  }, [token, loading]);

  const handleGetStarted = () => {
    router.push('/auth');
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#39FF14" />
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.duration(1000).springify()}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>MOTUS</Text>
            <View style={styles.dot} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(400).duration(1000)}>
          <Text style={styles.subtitle}>
            Regain control.{'\n'}Pay the price with sweat.
          </Text>
        </Animated.View>
      </View>

      <Animated.View 
        style={styles.footer}
        entering={FadeInDown.delay(800).duration(1000).springify()}
      >
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#39FF14',
    marginLeft: 8,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 20,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 32,
    fontWeight: '500',
  },
  footer: {
    padding: 32,
    paddingBottom: 64,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#39FF14',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
  },
});
