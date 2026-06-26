import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Switch, 
  Modal, 
  TextInput, 
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useMotusStore } from '../../store/useStore';

const { width } = Dimensions.get('window');

const EXERCISES = [
  { id: 'pushups', name: 'Push-ups', image: require('../../../assets/images/exercises/pushup.png') },
  { id: 'squats', name: 'Air Squats', image: require('../../../assets/images/exercises/squat.png') },
  { id: 'pullups', name: 'Pull-ups', image: require('../../../assets/images/exercises/pullup.png') },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { 
    selectedExercise, 
    setExercise, 
    repCount, 
    setRepCount, 
    strictMode, 
    setStrictMode,
    user,
    signOut,
    updateProfileName
  } = useMotusStore();
  
  // Local state
  const [sounds, setSounds] = useState(true);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [isSavingName, setIsSavingName] = useState(false);

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive", 
          onPress: async () => {
            await signOut();
            router.replace('/auth');
          } 
        }
      ]
    );
  };

  const handleSaveName = async () => {
    if (!newName.trim()) {
      Alert.alert("Error", "Name cannot be empty.");
      return;
    }
    setIsSavingName(true);
    const success = await updateProfileName(newName.trim());
    setIsSavingName(false);
    if (success) {
      setEditModalVisible(false);
    } else {
      Alert.alert("Error", "Failed to update profile name.");
    }
  };

  const renderSettingRow = (
    iconName: string, 
    title: string, 
    hasSwitch?: boolean, 
    switchValue?: boolean, 
    onSwitchChange?: (val: boolean) => void, 
    description?: string
  ) => (
    <View style={styles.settingRowContainer}>
      <View style={styles.settingRow}>
        <View style={styles.settingRowLeft}>
          <View style={styles.settingIconContainer}>
            <SymbolView name={iconName as any} size={20} tintColor="#FFFFFF" fallback={<View style={{width: 20, height: 20}} />} />
          </View>
          <Text style={styles.settingRowTitle}>{title}</Text>
        </View>
        {hasSwitch ? (
          <Switch 
            value={switchValue} 
            onValueChange={onSwitchChange} 
            trackColor={{ false: '#3a3a3c', true: '#39FF14' }}
            thumbColor="#FFFFFF"
          />
        ) : (
          <SymbolView name="chevron.right" size={20} tintColor="#666666" fallback={<Text style={{color: '#666'}}>&gt;</Text>} />
        )}
      </View>
      {description && (
        <Text style={styles.settingRowDescription}>{description}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.header}>Settings</Text>

        {/* Profile Section */}
        <BlurView intensity={25} tint="dark" style={styles.profileCard}>
          <View style={styles.profileImageContainer}>
            <SymbolView name="person.crop.circle.fill" size={64} tintColor="#39FF14" fallback={<View style={{width: 64, height: 64, backgroundColor: '#39FF14', borderRadius: 32}} />} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{user?.name || 'Guest User'}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{user?.email || 'guest@motus.fit'}</Text>
            <View style={styles.proBadge}>
              <SymbolView name="star.fill" size={10} tintColor="#000000" fallback={<View />} />
              <Text style={styles.proBadgeText}>MOTUS PRO</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.editProfileBtn}
            onPress={() => {
              setNewName(user?.name || '');
              setEditModalVisible(true);
            }}
          >
            <SymbolView name="pencil" size={16} tintColor="#FFFFFF" fallback={<Text style={{color: 'white'}}>Edit</Text>} />
          </TouchableOpacity>
        </BlurView>

        {/* Challenge Configuration */}
        <Text style={styles.sectionTitle}>Challenge Config</Text>
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

        <View style={styles.repControlWrapper}>
          <Text style={styles.repLabel}>Required Reps</Text>
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
        </View>

        {/* Training / Tutorial Mode */}
        <TouchableOpacity style={styles.trainingCard} activeOpacity={0.9} onPress={() => router.push('/camera')}>
          <View style={styles.trainingIconWrapper}>
            <SymbolView name="figure.highintensity.intervaltraining" size={32} tintColor="#000000" fallback={<View />} />
          </View>
          <View style={styles.trainingContent}>
            <Text style={styles.trainingTitle}>Training Mode</Text>
            <Text style={styles.trainingSubtitle}>Practice form & camera positioning</Text>
          </View>
          <SymbolView name="chevron.right" size={20} tintColor="#000000" fallback={<Text style={{color: '#000'}}>&gt;</Text>} />
        </TouchableOpacity>

        {/* App Preferences */}
        <Text style={styles.sectionTitle}>App Preferences</Text>
        <BlurView intensity={20} tint="dark" style={styles.settingsGroup}>
          {renderSettingRow(
            'figure.stand.line.dotted.figure.stand', 
            'Strict Form Checking', 
            true, 
            strictMode, 
            setStrictMode,
            'Enforces deeper depth and straighter body posture for reps to count.'
          )}
          <View style={styles.separator} />
          {renderSettingRow('speaker.wave.2.fill', 'Sound Effects', true, sounds, setSounds)}
        </BlurView>

        {/* Support & About */}
        <Text style={styles.sectionTitle}>Support & About</Text>
        <BlurView intensity={20} tint="dark" style={styles.settingsGroup}>
          {renderSettingRow('questionmark.circle.fill', 'Help & FAQ', false)}
          <View style={styles.separator} />
          {renderSettingRow('envelope.fill', 'Contact Us', false)}
          <View style={styles.separator} />
          {renderSettingRow('doc.text.fill', 'Privacy Policy', false)}
        </BlurView>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <SymbolView name="power" size={18} tintColor="#FF3B30" style={{ marginRight: 8 }} fallback={<View />} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isEditModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <BlurView intensity={60} tint="dark" style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Profile Name</Text>
            <Text style={styles.modalSubtitle}>How should Motus address you?</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Name"
              placeholderTextColor="#666"
              value={newName}
              onChangeText={setNewName}
              selectionColor="#39FF14"
              autoFocus
              autoCapitalize="words"
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelBtn]} 
                onPress={() => setEditModalVisible(false)}
                disabled={isSavingName}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalSaveBtn]} 
                onPress={handleSaveName}
                disabled={isSavingName}
              >
                {isSavingName ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
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
  content: {
    padding: 24,
    paddingTop: 80,
    paddingBottom: 120,
  },
  header: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  profileImageContainer: {
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 8,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#39FF14',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  proBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  editProfileBtn: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8E8E93',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  exerciseContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  exerciseCard: {
    width: (width - 48 - 24) / 3,
    height: 120,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  exerciseCardSelected: {
    borderColor: '#39FF14',
    backgroundColor: 'rgba(57,255,20,0.08)',
  },
  exerciseName: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
  },
  exerciseNameSelected: {
    color: '#39FF14',
  },
  repControlWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    borderRadius: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  repLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  repControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  repDisplay: {
    width: 50,
    alignItems: 'center',
  },
  repText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  trainingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#39FF14',
    padding: 20,
    borderRadius: 24,
    marginBottom: 32,
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  trainingIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  trainingContent: {
    flex: 1,
  },
  trainingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 2,
  },
  trainingSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.6)',
  },
  settingsGroup: {
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingRowContainer: {
    width: '100%',
  },
  settingRowDescription: {
    fontSize: 12,
    color: '#8E8E93',
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginTop: -8,
    lineHeight: 16,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  settingRowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginLeft: 68,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
    padding: 18,
    borderRadius: 24,
    marginBottom: 40,
  },
  signOutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: '#1C1C1E',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    height: 54,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 0.47,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalCancelText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '700',
  },
  modalSaveBtn: {
    backgroundColor: '#39FF14',
  },
  modalSaveText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
});
