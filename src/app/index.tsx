import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/auth');
  };

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
    backgroundColor: '#39FF14',
    borderRadius: 6,
    marginBottom: 12,
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  footer: {
    padding: 32,
    paddingBottom: 48,
  },
  primaryButton: {
    backgroundColor: '#39FF14',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#39FF14',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});
