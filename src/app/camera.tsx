import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { requireNativeModule } from 'expo-modules-core';
import * as Notifications from 'expo-notifications';
import MotusVisionView from '../../modules/motus-vision/src/MotusVisionView';
import { useMotusStore } from '../store/useStore';
import MotusScreenTime from '../../modules/motus-screen-time/src/MotusScreenTimeModule';

const { width, height } = Dimensions.get('window');
const MotusVision = requireNativeModule('MotusVision');

export default function CameraValidationScreen() {
  const router = useRouter();
  const { repCount: targetReps, selectedExercise, getEarnedMinutes, setLockExpiration } = useMotusStore();
  const [reps, setReps] = useState(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const getInitialInstruction = (exercise: string) => {
    switch (exercise) {
      case 'pushups': return "Place phone on floor. Face sideways so your entire body (head to toes) is visible.";
      case 'squats': return "Stand back 6 feet. Face right so your LEFT leg is visible.";
      case 'pullups': return "Ensure the bar and your entire upper body are in frame.";
      default: return "Ensure your full body is in frame.";
    }
  };

  const [instruction, setInstruction] = useState('Ensure your full body is in frame.');
  
  const scale = useSharedValue(1);
  const color = useSharedValue('#FFFFFF');

  const handleRepDetected = (event: any) => {
    const newCount = event.nativeEvent.count;
    if (newCount > reps) {
      setReps(newCount);
      
      if (newCount >= targetReps) {
        // Grand finale animation
        scale.value = withSequence(
          withTiming(1.6, { duration: 150 }),
          withSpring(1, { damping: 4, stiffness: 80 })
        );
        color.value = withTiming('#39FF14', { duration: 400 }); // Turn Neon Green on Success
        
        // No JS-side sound logic needed! The native view plays the triple-beep automatically.
        
        setInstruction('Challenge Completed! Great job!');
      } else {
        // Normal rep animation
        scale.value = withSequence(
          withTiming(1.2, { duration: 100 }),
          withSpring(1)
        );
        
        const praises = ["Great form!", "Keep it up!", "Excellent!", "Perfect!", "Nice work!"];
        setInstruction(praises[Math.floor(Math.random() * praises.length)]);
        
        setTimeout(() => {
          setInstruction('Keep going!');
        }, 2000);
      }
    }
  };

  const animatedCounterStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      color: color.value,
      textShadowColor: color.value,
    };
  });

  const handleCancel = () => {
    router.replace('/(tabs)');
  };

  const handleFinish = async () => {
    MotusScreenTime.unblockApps();
    
    const minutes = getEarnedMinutes();
    const expTime = Date.now() + (minutes * 60 * 1000);
    setLockExpiration(expTime);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time's up! ⏳",
        body: "Your earned screen time is over. Apps are locked again.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: minutes * 60
      },
    });

    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <MotusVisionView 
        style={StyleSheet.absoluteFill} 
        exerciseType={selectedExercise}
        targetReps={targetReps}
        playSound={isSoundEnabled}
        onRepDetected={handleRepDetected}
      />

      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <SymbolView name="xmark" size={20} tintColor="#FFFFFF" fallback={<Text style={{color:'white'}}>X</Text>} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setIsSoundEnabled(!isSoundEnabled)} style={[styles.closeButton, { marginRight: 12 }]}>
              <SymbolView name={isSoundEnabled ? "speaker.wave.2.fill" : "speaker.slash.fill"} size={18} tintColor="#FFFFFF" fallback={<Text style={{color:'white'}}>Snd</Text>} />
            </TouchableOpacity>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>TRACKING</Text>
            </View>
          </View>
        </View>

        <View style={styles.counterContainer}>
          <Animated.Text style={[styles.counterText, animatedCounterStyle]}>
            {reps}
          </Animated.Text>
          <Text style={styles.targetText}>/ {targetReps} {selectedExercise}</Text>
        </View>

        <View style={styles.footer}>
          {reps >= targetReps ? (
            <TouchableOpacity style={styles.successButton} onPress={handleFinish}>
              <SymbolView name="clock.fill" size={24} tintColor="#000000" fallback={<View/>}/>
              <Text style={styles.successButtonText}>{getEarnedMinutes()} Min Earned. Start Clock</Text>
            </TouchableOpacity>
          ) : (
            <BlurView intensity={20} tint="dark" style={styles.instructionBox}>
              <Text style={styles.instructionText}>{instruction}</Text>
            </BlurView>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#39FF14',
    marginRight: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  counterContainer: {
    alignItems: 'center',
  },
  counterText: {
    fontSize: 120,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  targetText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: -10,
    textTransform: 'uppercase'
  },
  footer: {
    minHeight: 80,
    justifyContent: 'flex-end',
  },
  instructionBox: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  successButton: {
    flexDirection: 'row',
    backgroundColor: '#39FF14',
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 5,
  },
  successButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 8,
  },
});
