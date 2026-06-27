import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  withRepeat,
  runOnJS,
  Easing,
  interpolate,
  interpolateColor,
  SharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { requireNativeModule } from 'expo-modules-core';
import * as Notifications from 'expo-notifications';
import MotusVisionView from '../../modules/motus-vision/src/MotusVisionView';
import { useMotusStore } from '../store/useStore';
import MotusScreenTime from '../../modules/motus-screen-time/src/MotusScreenTimeModule';
import { useKeepAwake } from 'expo-keep-awake';
import Svg, { Circle, Line, Ellipse, Path, Rect } from 'react-native-svg';


const { width, height } = Dimensions.get('window');
const MotusVision = requireNativeModule('MotusVision');

// Particle positions for the success burst effect
const PARTICLE_COUNT = 12;
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const angle = (i / PARTICLE_COUNT) * 2 * Math.PI;
  return {
    id: i,
    dx: Math.cos(angle),
    dy: Math.sin(angle),
    color: ['#39FF14', '#FFD60A', '#FF2D55', '#007AFF', '#BF5AF2', '#FF9500'][i % 6],
  };
});

export default function CameraValidationScreen() {
  useKeepAwake();
  const router = useRouter();
  const { repCount: targetReps, selectedExercise, strictMode, appRelockAlertEnabled, getEarnedMinutes, setLockExpiration, logWorkoutSession } = useMotusStore();
  const [reps, setReps] = useState(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const getInitialInstruction = (exercise: string) => {
    switch (exercise) {
      case 'pushups': return "Place phone on floor in front of you. Face the camera directly so your head and arms are in frame.";
      case 'squats': return "Stand back 6-8 feet. Face the camera directly so your full body is in frame.";
      case 'pullups': return "Ensure the bar, your head, and shoulders are in frame.";
      case 'jumping_jacks': return "Stand back so your full body is in frame. Raise arms above head to start.";
      case 'burpees': return "Stand back so your full body is in frame, including the floor.";
      case 'high_knees': return "Stand back 6-8 feet. Face the camera directly so your full body is in frame.";
      default: return "Ensure your full body is in frame.";
    }
  };

  const [praiseText, setPraiseText] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const getDisplayInstruction = () => {
    if (reps >= targetReps) {
      return 'Challenge Completed! 🎉';
    }
    if (reps > 0) {
      return praiseText || 'Keep going!';
    }
    if (isLocked) {
      return 'LOCK ACQUIRED! Start your repetitions.';
    }
    return getInitialInstruction(selectedExercise);
  };

  const handleBodyLocked = useCallback((event: any) => {
    const locked = event.nativeEvent.locked;
    setIsLocked(locked);
  }, []);

  const progressVal = useSharedValue(0);
  const handleProgressChanged = useCallback((event: any) => {
    const p = event.nativeEvent.progress;
    progressVal.value = withTiming(p, { duration: 80 });
  }, []);

  // Depth Gauge animations
  const depthGaugeStyle = useAnimatedStyle(() => {
    const opacity = isLocked ? withTiming(1, { duration: 300 }) : withTiming(0, { duration: 300 });
    return {
      opacity,
      transform: [
        { translateX: isLocked ? withSpring(0, { damping: 15 }) : withSpring(-20, { damping: 15 }) }
      ]
    };
  });

  const progressBarStyle = useAnimatedStyle(() => {
    const barHeight = progressVal.value * 180;
    const backgroundColor = interpolateColor(
      progressVal.value,
      [0, 0.95, 1],
      ['#00e5ff', '#39ff14', '#39ff14']
    );
    return {
      height: barHeight,
      backgroundColor,
    };
  });
  
  // Counter animations
  const scale = useSharedValue(1);
  const color = useSharedValue('#FFFFFF');
  
  // Success overlay animations
  const flashOpacity = useSharedValue(0);
  const successBadgeScale = useSharedValue(0);
  const successBadgeOpacity = useSharedValue(0);
  const particleProgress = useSharedValue(0);
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const checkScale = useSharedValue(0);

  const triggerSuccessAnimation = useCallback(() => {
    setShowSuccess(true);

    // 1. Screen flash - quick white flash then fade
    flashOpacity.value = withSequence(
      withTiming(0.6, { duration: 100 }),
      withTiming(0, { duration: 400 })
    );

    // 2. Expanding ring
    ringScale.value = withTiming(3, { duration: 600, easing: Easing.out(Easing.cubic) });
    ringOpacity.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withDelay(200, withTiming(0, { duration: 400 }))
    );

    // 3. Particle burst
    particleProgress.value = 0;
    particleProgress.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });

    // 4. Success badge drops in
    successBadgeScale.value = withDelay(200, withSequence(
      withSpring(1.2, { damping: 6, stiffness: 150 }),
      withSpring(1, { damping: 8, stiffness: 100 })
    ));
    successBadgeOpacity.value = withDelay(200, withTiming(1, { duration: 200 }));

    // 5. Checkmark pops in
    checkScale.value = withDelay(400, withSequence(
      withSpring(1.3, { damping: 5, stiffness: 200 }),
      withSpring(1, { damping: 8, stiffness: 120 })
    ));
  }, []);

  const handleRepDetected = (event: any) => {
    const newCount = event.nativeEvent.count;
    if (newCount > reps) {
      setReps(newCount);
      
      if (newCount >= targetReps) {
        // Grand finale - counter animation
        scale.value = withSequence(
          withTiming(1.8, { duration: 200 }),
          withSpring(1, { damping: 4, stiffness: 80 })
        );
        color.value = withTiming('#39FF14', { duration: 300 });

        // The native side plays the success chime automatically.
        // Trigger the JS success overlay animation.
        triggerSuccessAnimation();
      } else {
        // Normal rep animation - quick pop
        scale.value = withSequence(
          withTiming(1.2, { duration: 80 }),
          withSpring(1, { damping: 12, stiffness: 200 })
        );
        
        const praises = ["Great form!", "Keep it up!", "Excellent!", "Perfect!", "Nice work!"];
        setPraiseText(praises[Math.floor(Math.random() * praises.length)]);
        
        setTimeout(() => {
          setPraiseText('Keep going!');
        }, 2000);
      }
    }
  };

  const animatedCounterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    color: color.value,
    textShadowColor: color.value,
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const successBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successBadgeScale.value }],
    opacity: successBadgeOpacity.value,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const handleCancel = () => {
    router.replace('/(tabs)');
  };

  const handleFinish = async () => {
    if (isFinishing) return;
    setIsFinishing(true);

    try {
      await logWorkoutSession(selectedExercise, targetReps);
    } catch (e) {
      console.log('Failed to log workout session:', e);
    }

    MotusScreenTime.unblockApps();
    
    const minutes = getEarnedMinutes();
    const expTime = Date.now() + (minutes * 60 * 1000);
    setLockExpiration(expTime);
    
    if (appRelockAlertEnabled) {
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
    }

    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <MotusVisionView 
        style={StyleSheet.absoluteFill} 
        exerciseType={selectedExercise}
        targetReps={targetReps}
        playSound={isSoundEnabled}
        strictMode={strictMode}
        onRepDetected={handleRepDetected}
        onBodyLocked={handleBodyLocked}
        onProgressChanged={handleProgressChanged}
      />

      {/* SVG Stencil Overlay */}
      <StencilOverlay exercise={selectedExercise} isLocked={isLocked} />

      {/* Depth Gauge HUD Overlay */}
      {['pushups', 'squats', 'pullups', 'high_knees'].includes(selectedExercise) && (
        <Animated.View style={[styles.depthGaugeContainer, depthGaugeStyle]} pointerEvents="none">
          <BlurView intensity={25} style={StyleSheet.absoluteFill} tint="dark" />
          <View style={styles.depthGaugeTrack}>
            <Animated.View style={[styles.depthGaugeFill, progressBarStyle]} />
            <View style={styles.depthGaugeTargetLine} />
          </View>
          <Text style={styles.depthGaugeLabel}>DEPTH</Text>
        </Animated.View>
      )}

      {/* Screen flash overlay */}
      <Animated.View style={[styles.flashOverlay, flashStyle]} pointerEvents="none" />

      {/* Expanding ring */}
      {showSuccess && (
        <View style={styles.ringContainer} pointerEvents="none">
          <Animated.View style={[styles.ring, ringStyle]} />
        </View>
      )}

      {/* Particle burst */}
      {showSuccess && (
        <View style={styles.particleContainer} pointerEvents="none">
          {PARTICLES.map((p) => (
            <ParticleDot key={p.id} particle={p} progress={particleProgress} />
          ))}
        </View>
      )}

      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <SymbolView name="xmark" size={20} tintColor="#FFFFFF" fallback={<Text style={{color:'white'}}>X</Text>} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setIsSoundEnabled(!isSoundEnabled)} style={[styles.closeButton, { marginRight: 12 }]}>
              <SymbolView name={isSoundEnabled ? "speaker.wave.2.fill" : "speaker.slash.fill"} size={18} tintColor="#FFFFFF" fallback={<Text style={{color:'white'}}>Snd</Text>} />
            </TouchableOpacity>
            <View style={[styles.statusBadge, { backgroundColor: isLocked ? 'rgba(57, 255, 20, 0.15)' : 'rgba(0,0,0,0.5)' }]}>
              <View style={[styles.statusDot, { backgroundColor: isLocked ? '#39FF14' : '#FF9500' }]} />
              <Text style={[styles.statusText, { color: isLocked ? '#39FF14' : '#FFFFFF' }]}>
                {isLocked ? 'BODY LOCKED' : 'SEARCHING'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.counterContainer}>
          {/* Success badge overlay */}
          {showSuccess && (
            <Animated.View style={[styles.successBadge, successBadgeStyle]}>
              <Animated.View style={checkStyle}>
                <SymbolView name="checkmark.circle.fill" size={64} tintColor="#39FF14" fallback={<Text style={{color:'#39FF14', fontSize: 40}}>✓</Text>} />
              </Animated.View>
              <Text style={styles.successTitle}>CHALLENGE{'\n'}COMPLETE!</Text>
            </Animated.View>
          )}

          <Animated.Text style={[styles.counterText, animatedCounterStyle]}>
            {reps}
          </Animated.Text>
          <Text style={styles.targetText}>/ {targetReps} {selectedExercise}</Text>
        </View>

        <View style={styles.footer}>
          {reps >= targetReps ? (
            <TouchableOpacity 
              style={[styles.successButton, isFinishing && { opacity: 0.5 }]} 
              onPress={handleFinish}
              disabled={isFinishing}
            >
              {isFinishing ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <>
                  <SymbolView name="clock.fill" size={24} tintColor="#000000" fallback={<View/>}/>
                  <Text style={styles.successButtonText}>{getEarnedMinutes()} Min Earned. Start Clock</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <BlurView intensity={20} tint="dark" style={styles.instructionBox}>
              <Text style={styles.instructionText}>{getDisplayInstruction()}</Text>
            </BlurView>
          )}
        </View>
      </View>
    </View>
  );
}

// Animated particle dot component
function ParticleDot({ particle, progress }: { particle: typeof PARTICLES[0]; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const distance = interpolate(progress.value, [0, 1], [0, 140]);
    const opacity = interpolate(progress.value, [0, 0.3, 1], [0, 1, 0]);
    const dotScale = interpolate(progress.value, [0, 0.2, 1], [0, 1.5, 0.3]);

    return {
      transform: [
        { translateX: particle.dx * distance },
        { translateY: particle.dy * distance },
        { scale: dotScale },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: particle.color,
        },
        style,
      ]}
    />
  );
}

// Transparent human silhouette stencil overlay guide
function StencilOverlay({ exercise, isLocked }: { exercise: string; isLocked: boolean }) {
  const color = isLocked ? '#39FF14' : 'rgba(255, 204, 0, 0.65)'; // Warm high-visibility yellow first, turns green when locked
  const strokeWidth = isLocked ? 3.5 : 2.5;
  const dashArray = isLocked ? undefined : [6, 4];
  
  if (exercise === 'pushups') {
    return (
      <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]} pointerEvents="none">
        <Svg height={height} width={width} style={StyleSheet.absoluteFill}>
          {/* Head */}
          <Ellipse 
            cx={width / 2} 
            cy={height * 0.38} 
            rx={42} 
            ry={52} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray} 
            fill="rgba(57, 255, 20, 0.03)"
          />
          {/* Neck */}
          <Line 
            x1={width / 2} 
            y1={height * 0.38 + 52} 
            x2={width / 2} 
            y2={height * 0.48} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          {/* Shoulders */}
          <Line 
            x1={width / 2 - 80} 
            y1={height * 0.48} 
            x2={width / 2 + 80} 
            y2={height * 0.48} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          {/* Torso */}
          <Path 
            d={`M ${width / 2 - 80} ${height * 0.48} L ${width / 2 - 50} ${height * 0.76} L ${width / 2 + 50} ${height * 0.76} L ${width / 2 + 80} ${height * 0.48} Z`}
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray} 
            fill="rgba(255,255,255,0.02)"
          />
          {/* Arms */}
          <Line 
            x1={width / 2 - 80} 
            y1={height * 0.48} 
            x2={width / 2 - 120} 
            y2={height * 0.62} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          <Line 
            x1={width / 2 - 120} 
            y1={height * 0.62} 
            x2={width / 2 - 100} 
            y2={height * 0.75} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          <Line 
            x1={width / 2 + 80} 
            y1={height * 0.48} 
            x2={width / 2 + 120} 
            y2={height * 0.62} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          <Line 
            x1={width / 2 + 120} 
            y1={height * 0.62} 
            x2={width / 2 + 100} 
            y2={height * 0.75} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          
          {/* Target points */}
          <Circle cx={width / 2} cy={height * 0.38} r={6} fill={color} />
          <Circle cx={width / 2 - 80} cy={height * 0.48} r={6} fill={color} />
          <Circle cx={width / 2 + 80} cy={height * 0.48} r={6} fill={color} />
          <Circle cx={width / 2 - 120} cy={height * 0.62} r={6} fill={color} />
          <Circle cx={width / 2 + 120} cy={height * 0.62} r={6} fill={color} />
          <Circle cx={width / 2 - 100} cy={height * 0.75} r={6} fill={color} />
          <Circle cx={width / 2 + 100} cy={height * 0.75} r={6} fill={color} />
        </Svg>
      </View>
    );
  }

  if (exercise === 'squats' || exercise === 'high_knees') {
    return (
      <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]} pointerEvents="none">
        <Svg height={height} width={width} style={StyleSheet.absoluteFill}>
          {/* Standing front-facing profile guide */}
          {/* Head */}
          <Circle 
            cx={width * 0.5} 
            cy={height * 0.23} 
            r={26} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray} 
            fill="rgba(57, 255, 20, 0.03)"
          />
          {/* Shoulders */}
          <Line 
            x1={width * 0.38} 
            y1={height * 0.34} 
            x2={width * 0.62} 
            y2={height * 0.34} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          {/* Torso / Spine */}
          <Line 
            x1={width * 0.5} 
            y1={height * 0.23 + 26} 
            x2={width * 0.5} 
            y2={height * 0.56} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          {/* Hips */}
          <Line 
            x1={width * 0.40} 
            y1={height * 0.56} 
            x2={width * 0.60} 
            y2={height * 0.56} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          {/* Left Leg (Hip -> Knee -> Ankle) */}
          <Line 
            x1={width * 0.40} 
            y1={height * 0.56} 
            x2={width * 0.40} 
            y2={height * 0.71} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          <Line 
            x1={width * 0.40} 
            y1={height * 0.71} 
            x2={width * 0.40} 
            y2={height * 0.86} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          {/* Right Leg (Hip -> Knee -> Ankle) */}
          <Line 
            x1={width * 0.60} 
            y1={height * 0.56} 
            x2={width * 0.60} 
            y2={height * 0.71} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          <Line 
            x1={width * 0.60} 
            y1={height * 0.71} 
            x2={width * 0.60} 
            y2={height * 0.86} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          {/* Left Arm (Shoulder -> Elbow -> Wrist) */}
          <Line 
            x1={width * 0.38} 
            y1={height * 0.34} 
            x2={width * 0.34} 
            y2={height * 0.46} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          <Line 
            x1={width * 0.34} 
            y1={height * 0.46} 
            x2={width * 0.34} 
            y2={height * 0.56} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          {/* Right Arm (Shoulder -> Elbow -> Wrist) */}
          <Line 
            x1={width * 0.62} 
            y1={height * 0.34} 
            x2={width * 0.66} 
            y2={height * 0.46} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          <Line 
            x1={width * 0.66} 
            y1={height * 0.46} 
            x2={width * 0.66} 
            y2={height * 0.56} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          
          {/* Target points */}
          <Circle cx={width * 0.5} cy={height * 0.23} r={6} fill={color} />
          <Circle cx={width * 0.38} cy={height * 0.34} r={5} fill={color} />
          <Circle cx={width * 0.62} cy={height * 0.34} r={5} fill={color} />
          <Circle cx={width * 0.40} cy={height * 0.56} r={5} fill={color} />
          <Circle cx={width * 0.60} cy={height * 0.56} r={5} fill={color} />
          <Circle cx={width * 0.40} cy={height * 0.71} r={5} fill={color} />
          <Circle cx={width * 0.60} cy={height * 0.71} r={5} fill={color} />
          <Circle cx={width * 0.40} cy={height * 0.86} r={5} fill={color} />
          <Circle cx={width * 0.60} cy={height * 0.86} r={5} fill={color} />
        </Svg>
      </View>
    );
  }

  if (exercise === 'pullups') {
    return (
      <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]} pointerEvents="none">
        <Svg height={height} width={width} style={StyleSheet.absoluteFill}>
          {/* Pullup bar at top */}
          <Line 
            x1={width * 0.15} 
            y1={height * 0.18} 
            x2={width * 0.85} 
            y2={height * 0.18} 
            stroke={color} 
            strokeWidth={strokeWidth + 2} 
            strokeDasharray={dashArray}
          />
          {/* Hanging body profile */}
          {/* Head */}
          <Circle 
            cx={width * 0.5} 
            cy={height * 0.35} 
            r={28} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray} 
            fill="rgba(57, 255, 20, 0.03)"
          />
          {/* Left Arm to Bar */}
          <Line 
            x1={width * 0.33} 
            y1={height * 0.18} 
            x2={width * 0.28} 
            y2={height * 0.29} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          <Line 
            x1={width * 0.28} 
            y1={height * 0.29} 
            x2={width * 0.36} 
            y2={height * 0.38} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          {/* Right Arm to Bar */}
          <Line 
            x1={width * 0.67} 
            y1={height * 0.18} 
            x2={width * 0.72} 
            y2={height * 0.29} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          <Line 
            x1={width * 0.72} 
            y1={height * 0.29} 
            x2={width * 0.64} 
            y2={height * 0.38} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          {/* Shoulders */}
          <Line 
            x1={width * 0.36} 
            y1={height * 0.38} 
            x2={width * 0.64} 
            y2={height * 0.38} 
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray}
          />
          {/* Torso */}
          <Path 
            d={`M ${width * 0.36} ${height * 0.38} L ${width * 0.38} ${height * 0.63} L ${width * 0.62} ${height * 0.63} L ${width * 0.64} ${height * 0.38} Z`}
            stroke={color} 
            strokeWidth={strokeWidth} 
            strokeDasharray={dashArray} 
            fill="rgba(255,255,255,0.02)"
          />
          
          {/* Target points */}
          <Circle cx={width * 0.33} cy={height * 0.18} r={6} fill={color} />
          <Circle cx={width * 0.67} cy={height * 0.18} r={6} fill={color} />
          <Circle cx={width * 0.5} cy={height * 0.35} r={6} fill={color} />
          <Circle cx={width * 0.36} cy={height * 0.38} r={6} fill={color} />
          <Circle cx={width * 0.64} cy={height * 0.38} r={6} fill={color} />
          <Circle cx={width * 0.38} cy={height * 0.63} r={6} fill={color} />
          <Circle cx={width * 0.62} cy={height * 0.63} r={6} fill={color} />
        </Svg>
      </View>
    );
  }

  // Fallback for general movements
  return (
    <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]} pointerEvents="none">
      <Svg height={height} width={width} style={StyleSheet.absoluteFill}>
        {/* Simple box outline guide */}
        <Rect 
          x={width * 0.15} 
          y={height * 0.2} 
          width={width * 0.7} 
          height={height * 0.6} 
          rx={20}
          stroke={color} 
          strokeWidth={strokeWidth} 
          strokeDasharray={dashArray} 
          fill="rgba(255,255,255,0.01)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  ringContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  ring: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#39FF14',
    backgroundColor: 'transparent',
  },
  particleContainer: {
    position: 'absolute',
    top: height * 0.38,
    left: width / 2 - 5,
    width: 10,
    height: 10,
    zIndex: 11,
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
  successBadge: {
    position: 'absolute',
    top: -100,
    alignItems: 'center',
    zIndex: 20,
  },
  successTitle: {
    color: '#39FF14',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 8,
    textShadowColor: 'rgba(57,255,20,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
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
  depthGaugeContainer: {
    position: 'absolute',
    left: 24,
    top: height * 0.3,
    width: 50,
    height: 230,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  depthGaugeTrack: {
    width: 12,
    height: 180,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  depthGaugeFill: {
    width: '100%',
    borderRadius: 6,
  },
  depthGaugeTargetLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#39FF14',
  },
  depthGaugeLabel: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 8,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
});
