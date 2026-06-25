import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Image } from 'react-native';
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
  const { loadState, selectedExercise, setExercise, repCount, setRepCount, getEarnedMinutes } = useMotusStore();
  const [isConfigModalVisible, setConfigModalVisible] = useState(false);

  useEffect(() => {
    loadState();
    requestNotificationPermission();
  }, []);

  const requestNotificationPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        Alert.alert("Permission Required", "Please allow notifications in Settings so Motus can wake up when you tap the unlock button.");
      }
    }
  };

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
        // Instead of immediately blocking, show the premium config modal
        setConfigModalVisible(true);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to configure Screen Time.");
    }
  };

  const confirmLock = () => {
    MotusScreenTime.blockApps();
    setConfigModalVisible(false);
    Alert.alert("Success", "Apps have been locked. They will now require a physical challenge to open.");
  };

  const handleUnblock = () => {
    MotusScreenTime.unblockApps();
    Alert.alert("Success", "All apps have been unblocked.");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Locker</Text>
        <Text style={styles.subtitle}>Select apps to intercept</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <BlurView intensity={15} style={styles.infoCard} tint="light">
          <SymbolView name="shield.lefthalf.filled" size={40} tintColor="#39FF14" fallback={<View style={{ width: 40, height: 40 }}/>} />
          <Text style={styles.infoText}>
            Motus uses Apple's Screen Time API to securely block your selected apps. 
            When blocked, opening them will redirect you here to complete your exercise.
          </Text>
        </BlurView>

        <TouchableOpacity style={styles.primaryButton} onPress={handleSelectApps}>
          <Text style={styles.primaryButtonText}>Select Apps to Lock</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleUnblock}>
          <Text style={styles.secondaryButtonText}>Remove All Locks</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isConfigModalVisible}
        onRequestClose={() => setConfigModalVisible(false)}
      >
        <BlurView intensity={80} tint="dark" style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Set Your Challenge</Text>
            <Text style={styles.modalSubtitle}>How will you unlock your apps?</Text>

            <View style={styles.exerciseContainer}>
              {EXERCISES.map((ex) => {
                const isSelected = selectedExercise === ex.id;
                return (
                  <TouchableOpacity 
                    key={ex.id} 
                    activeOpacity={0.8}
                    onPress={() => setExercise(ex.id)}
                  >
                    <View 
                      style={[styles.exerciseCard, isSelected && styles.exerciseCardSelected]}
                    >
                      <Image 
                        source={ex.image} 
                        style={{ width: 40, height: 40, borderRadius: 8, opacity: isSelected ? 1 : 0.4 }} 
                        resizeMode="contain"
                      />
                      <Text style={[styles.exerciseName, isSelected && styles.exerciseNameSelected]}>
                        {ex.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.repSectionTitle}>Required Reps</Text>
            <View style={styles.repControlContainer}>
              <TouchableOpacity 
                style={styles.repButton} 
                onPress={() => setRepCount(Math.max(1, repCount - 5))}
              >
                <SymbolView name="minus" size={24} tintColor="#FFFFFF" fallback={<Text style={{color: 'white'}}>-</Text>} />
              </TouchableOpacity>
              
              <View style={styles.repDisplay}>
                <Text style={styles.repText}>{repCount}</Text>
              </View>

              <TouchableOpacity 
                style={styles.repButton} 
                onPress={() => setRepCount(repCount + 5)}
              >
                <SymbolView name="plus" size={24} tintColor="#FFFFFF" fallback={<Text style={{color: 'white'}}>+</Text>} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.confirmButton} onPress={confirmLock}>
              <Text style={styles.confirmButtonText}>Lock to Earn {getEarnedMinutes()} Minutes</Text>
              <SymbolView name="lock.fill" size={18} tintColor="#000000" fallback={<View />} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setConfigModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>
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
});

