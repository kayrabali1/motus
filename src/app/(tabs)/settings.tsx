import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useMotusStore } from '../../store/useStore';

const EXERCISES = [
  { id: 'pushups', name: 'Push-ups', image: require('../../../assets/images/exercises/pushup.png') },
  { id: 'squats', name: 'Air Squats', image: require('../../../assets/images/exercises/squat.png') },
  { id: 'pullups', name: 'Pull-ups', image: require('../../../assets/images/exercises/pullup.png') },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { selectedExercise, setExercise, repCount, setRepCount } = useMotusStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Challenge Config</Text>

      <Text style={styles.sectionTitle}>Unlock Mechanism</Text>
      <View style={styles.exerciseContainer}>
        {EXERCISES.map((ex) => {
          const isSelected = selectedExercise === ex.id;
          return (
            <TouchableOpacity 
              key={ex.id} 
              activeOpacity={0.8}
              onPress={() => setExercise(ex.id)}
            >
              <BlurView 
                intensity={isSelected ? 40 : 15} 
                tint={isSelected ? 'prominent' : 'light'}
                style={[styles.exerciseCard, isSelected && styles.exerciseCardSelected]}
              >
                <Image 
                  source={ex.image} 
                  style={{ width: 48, height: 48, borderRadius: 8, opacity: isSelected ? 1 : 0.4 }} 
                  resizeMode="contain"
                />
                <Text style={[styles.exerciseName, isSelected && styles.exerciseNameSelected]}>
                  {ex.name}
                </Text>
              </BlurView>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Required Reps: {repCount}</Text>
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
      
      <View style={{ marginTop: 40 }}>
        <TouchableOpacity style={styles.testButton} onPress={() => router.push('/camera')}>
          <SymbolView name="play.fill" size={20} tintColor="#000000" fallback={<View style={{ width: 20, height: 20 }}/>} />
          <Text style={styles.testButtonText}>Test Challenge</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    padding: 24,
    paddingTop: 80,
    paddingBottom: 120,
  },
  header: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  exerciseContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  exerciseCard: {
    width: 100,
    height: 120,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  exerciseCardSelected: {
    borderColor: '#39FF14',
    backgroundColor: 'rgba(57,255,20,0.1)',
  },
  exerciseName: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  exerciseNameSelected: {
    color: '#39FF14',
  },
  repControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  repButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  repDisplay: {
    width: 100,
    alignItems: 'center',
  },
  repText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  testButton: {
    flexDirection: 'row',
    backgroundColor: '#39FF14',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
});
