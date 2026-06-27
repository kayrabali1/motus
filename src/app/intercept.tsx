import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMotusStore, EXERCISE_MULTIPLIERS } from '../store/useStore';

const EXERCISES = [
  { id: 'pushups', name: 'Push-ups', image: require('../../assets/images/exercises/pushup.png') },
  { id: 'squats', name: 'Air Squats', image: require('../../assets/images/exercises/squat.png') },
  { id: 'pullups', name: 'Pull-ups', image: require('../../assets/images/exercises/pullup.png') },
  { id: 'jumping_jacks', name: 'Jumping Jacks', image: require('../../assets/images/exercises/jumping_jacks.png') },
  { id: 'burpees', name: 'Burpees', image: require('../../assets/images/exercises/burpees.png') },
  { id: 'high_knees', name: 'High Knees', image: require('../../assets/images/exercises/high_knees.png') },
] as const;

export default function InterceptScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { 
    selectedExercise, 
    repCount, 
    setExercise, 
    setRepCount,
    activeLockCount 
  } = useMotusStore();

  const getEarnedMinutes = () => {
    const multiplier = EXERCISE_MULTIPLIERS[selectedExercise] || 1;
    return repCount * multiplier;
  };

  const getExerciseLabel = (count: number) => {
    if (selectedExercise === 'pushups') return count === 1 ? 'push-up' : 'push-ups';
    if (selectedExercise === 'squats') return count === 1 ? 'air squat' : 'air squats';
    if (selectedExercise === 'pullups') return count === 1 ? 'pull-up' : 'pull-ups';
    if (selectedExercise === 'jumping_jacks') return count === 1 ? 'jumping jack' : 'jumping jacks';
    if (selectedExercise === 'burpees') return count === 1 ? 'burpee' : 'burpees';
    if (selectedExercise === 'high_knees') return count === 1 ? 'high knee' : 'high knees';
    return count === 1 ? 'rep' : 'reps';
  };

  const handleStartChallenge = () => {
    // The store already has selectedExercise and repCount.
    router.replace('/camera');
  };

  const handleCancel = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={100} style={StyleSheet.absoluteFill} tint="dark" />
      
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingTop: Math.max(20, insets.top),
            paddingBottom: Math.max(20, insets.bottom),
          }
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={styles.content}>
          <Animated.View entering={ZoomIn.duration(800).springify()}>
            <View style={styles.iconContainer}>
              <SymbolView name="lock.shield.fill" size={64} tintColor="#FF3B30" fallback={<View style={{ width: 64, height: 64 }}/>} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(800)}>
            <Text style={styles.title}>Set Your Challenge</Text>
            <Text style={styles.subtitle}>
              How will you unlock your {activeLockCount <= 1 ? 'app' : 'apps'}?
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.challengeBox}>
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTextBase}>
                Unlock your {activeLockCount <= 1 ? 'app' : 'apps'} for{' '}
              </Text>
              <Animated.Text key={`min-${getEarnedMinutes()}`} entering={ZoomIn.springify()} style={styles.summaryHighlight}>
                {getEarnedMinutes()}
              </Animated.Text>
              <Text style={styles.summaryTextBase}>
                {' '}minutes with{' '}
              </Text>
              <Animated.Text key={`rep-${repCount}`} entering={ZoomIn.springify()} style={styles.summaryHighlight}>
                {repCount}
              </Animated.Text>
              <Animated.Text key={`lbl-${selectedExercise}-${repCount}`} entering={ZoomIn.springify()} style={styles.summaryTextBase}>
                {' '}{getExerciseLabel(repCount)}
              </Animated.Text>
            </View>

            <View style={styles.exerciseContainer}>
              {EXERCISES.map((ex) => {
                const isSelected = selectedExercise === ex.id;
                return (
                  <TouchableOpacity 
                    key={ex.id} 
                    activeOpacity={0.8}
                    onPress={() => setExercise(ex.id as any)}
                    style={[styles.exerciseCard, isSelected && styles.exerciseCardSelected]}
                  >
                    <Image 
                      source={ex.image} 
                      style={{ width: 44, height: 44, opacity: isSelected ? 1 : 0.5 }} 
                      resizeMode="contain"
                    />
                    <Text style={[styles.exerciseName, isSelected && styles.exerciseNameSelected]} numberOfLines={1} adjustsFontSizeToFit>
                      {ex.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.repSectionTitle}>Required Reps</Text>
            <View style={styles.repControlContainer}>
              <TouchableOpacity 
                style={styles.repButton} 
                onPress={() => setRepCount(Math.max(1, repCount - 1))}
              >
                <SymbolView name="minus" size={24} tintColor="#FFFFFF" fallback={<Text style={{color: 'white'}}>-</Text>} />
              </TouchableOpacity>
              
              <View style={styles.repDisplay}>
                <Text style={styles.repText}>{repCount}</Text>
              </View>

              <TouchableOpacity 
                style={styles.repButton} 
                onPress={() => setRepCount(repCount + 1)}
              >
                <SymbolView name="plus" size={24} tintColor="#FFFFFF" fallback={<Text style={{color: 'white'}}>+</Text>} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.footer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleStartChallenge} activeOpacity={0.8}>
            <SymbolView name="camera.viewfinder" size={20} tintColor="#000000" fallback={<View style={{ width: 20, height: 20 }}/>} />
            <Text style={styles.primaryButtonText}>Start Challenge</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={handleCancel}>
            <Text style={styles.secondaryButtonText}>Give Up</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
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
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryTextBase: {
    color: '#39FF14',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 32,
  },
  summaryHighlight: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginHorizontal: 4,
  },
  exerciseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    marginBottom: 24,
  },
  exerciseCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    width: '28%',
    aspectRatio: 1,
  },
  exerciseCardSelected: {
    borderColor: '#39FF14',
    backgroundColor: 'rgba(57, 255, 20, 0.1)',
  },
  exerciseName: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  exerciseNameSelected: {
    color: '#39FF14',
    fontWeight: '800',
  },
  repSectionTitle: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 16,
    marginTop: 8,
  },
  repControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  repDisplay: {
    width: 80,
    alignItems: 'center',
  },
  repText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    width: '100%',
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
