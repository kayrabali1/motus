import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Image, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import * as Notifications from 'expo-notifications';
import MotusScreenTime from '../../../modules/motus-screen-time/src/MotusScreenTimeModule';
import { useMotusStore } from '../../store/useStore';

const EXERCISES = [
  { id: 'pushups', name: 'Push-ups', image: require('../../../assets/images/exercises/pushup.png') },
  { id: 'squats', name: 'Air Squats', image: require('../../../assets/images/exercises/squat.png') },
  { id: 'pullups', name: 'Pull-ups', image: require('../../../assets/images/exercises/pullup.png') },
];

export default function AppsScreen() {
  const { loadState, selectedExercise, setExercise, repCount, setRepCount, getEarnedMinutes, activeLockCount, setActiveLockCount } = useMotusStore();


  async function requestNotificationPermission() {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        Alert.alert("Permission Required", "Please allow notifications in Settings so Motus can wake up when you tap the unlock button.");
      }
    }
  };

  useEffect(() => {
    loadState();
    requestNotificationPermission();
  }, []);

  const handleSelectApps = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Required", "Please allow notifications so Motus can wake up when you tap the unlock button.");
        return;
      }

      await MotusScreenTime.requestAuthorization();
      const success = await MotusScreenTime.showPicker();
      if (success) {
        MotusScreenTime.blockApps();
        const count = await MotusScreenTime.getActiveLockCount();
        setActiveLockCount(count);
        if (count > 0) {
          Alert.alert("Apps Locked", "Your apps are securely locked. You will be prompted to choose a physical challenge when you try to open them.");
        }
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to configure Screen Time.");
    }
  };

  const handleViewLockedApps = async () => {
    try {
      await MotusScreenTime.showLockedApps();
      const count = await MotusScreenTime.getActiveLockCount();
      setActiveLockCount(count);
    } catch (e) {
      console.log(e);
    }
  };
  const getExerciseLabel = (reps: number) => {
    const isPlural = reps !== 1;
    switch (selectedExercise) {
      case 'pushups':
        return isPlural ? 'push-ups' : 'push-up';
      case 'squats':
        return isPlural ? 'air squats' : 'air squat';
      case 'pullups':
        return isPlural ? 'pull-ups' : 'pull-up';
      default:
        return isPlural ? 'reps' : 'rep';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Locker</Text>
        <Text style={styles.subtitle}>Select apps to intercept</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeLockCount > 0 ? (
          <TouchableOpacity onPress={handleViewLockedApps} activeOpacity={0.8} style={{ width: '100%', alignItems: 'center' }}>
            <BlurView intensity={20} style={[styles.infoCard, { borderColor: '#FF3B30' }]} tint="dark">
              <SymbolView name="shield.lefthalf.filled" size={40} tintColor="#FF3B30" fallback={<View style={{ width: 40, height: 40 }}/>} />
              <Text style={[styles.infoText, { color: '#FF3B30', fontWeight: 'bold', fontSize: 18, marginTop: 12 }]}>
                {activeLockCount} App{activeLockCount > 1 ? 's' : ''} Locked
              </Text>
              <Text style={[styles.infoText, { marginTop: 4, textAlign: 'center' }]}>
                Tap to view locked apps or emergency disable individually.
              </Text>
            </BlurView>
          </TouchableOpacity>
        ) : (
          <BlurView intensity={15} style={styles.infoCard} tint="light">
            <SymbolView name="shield.lefthalf.filled" size={40} tintColor="#39FF14" fallback={<View style={{ width: 40, height: 40 }}/>} />
            <Text style={styles.infoText}>
              Motus uses Apple&apos;s Screen Time API to securely block your selected apps. 
              When blocked, opening them will redirect you here to complete your exercise.
            </Text>
          </BlurView>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={handleSelectApps}>
          <Text style={styles.primaryButtonText}>{activeLockCount > 0 ? 'Lock More Apps' : 'Select Apps to Lock'}</Text>
        </TouchableOpacity>
      </ScrollView>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    padding: 24,
    paddingTop: 80,
    paddingBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
    alignItems: 'center',
  },
  infoCard: {
    padding: 24,
    borderRadius: 20,
    marginBottom: 32,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: '#39FF14',
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
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
  },
  secondaryButton: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#3A3A3C',
    borderRadius: 3,
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 32,
  },
  exerciseContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
  },
  exerciseCard: {
    width: 100,
    height: 110,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  exerciseCardSelected: {
    borderColor: '#39FF14',
    backgroundColor: 'rgba(57,255,20,0.1)',
  },
  exerciseName: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  exerciseNameSelected: {
    color: '#39FF14',
  },
  repSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  repControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  repButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2C2C2E',
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
  confirmButton: {
    flexDirection: 'row',
    backgroundColor: '#39FF14',
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  confirmButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 8,
  },
  cancelButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  cancelButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
  },
  shamePhraseContainer: {
    backgroundColor: 'rgba(255,59,48,0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
    width: '100%',
  },
  shamePhraseText: {
    color: '#FF3B30',
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  shameInput: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#3A3A3C',
    borderRadius: 16,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 100,
    width: '100%',
    marginBottom: 24,
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  challengeSummaryText: {
    fontSize: 16,
    color: '#39FF14',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
});

