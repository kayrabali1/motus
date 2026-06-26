import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useMotusStore } from '../store/useStore';

export default function InterceptScreen() {
  const router = useRouter();
  const { selectedExercise, repCount } = useMotusStore();

  const handleUnlock = () => {
    router.replace('/camera');
  };

  const handleCancel = () => {
    router.replace('/(tabs)');
  };

  const exerciseLabel = selectedExercise === 'pushups' ? 'Push-ups' : selectedExercise === 'squats' ? 'Air Squats' : 'Pull-ups';

  return (
    <View style={styles.container}>
      <BlurView intensity={100} style={StyleSheet.absoluteFill} tint="dark" />
      
      <View style={styles.content}>
        <Animated.View entering={ZoomIn.duration(800).springify()}>
          <View style={styles.iconContainer}>
            <SymbolView name="lock.shield.fill" size={64} tintColor="#FF3B30" fallback={<View style={{ width: 64, height: 64 }}/>} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(800)}>
          <Text style={styles.title}>Access Blocked</Text>
          <Text style={styles.subtitle}>
            This application is currently locked. You must complete your physical challenge to regain access.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.challengeBox}>
          <Text style={styles.challengeLabel}>CHALLENGE</Text>
          <Text style={styles.challengeValue}>{repCount} {exerciseLabel}</Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleUnlock} activeOpacity={0.8}>
          <SymbolView name="camera.viewfinder" size={20} tintColor="#000000" fallback={<View style={{ width: 20, height: 20 }}/>} />
          <Text style={styles.primaryButtonText}>Start Validation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton} onPress={handleCancel}>
          <Text style={styles.secondaryButtonText}>Give Up</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 48,
  },
  challengeBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 24,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  challengeLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  challengeValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#39FF14',
  },
  footer: {
    padding: 32,
    paddingBottom: 64,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#39FF14',
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  secondaryButton: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
  },
});
