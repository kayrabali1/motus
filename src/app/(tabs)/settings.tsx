import React, { useState, useEffect } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  withRepeat,
  interpolate
} from 'react-native-reanimated';
import { useMotusStore, EXERCISE_MULTIPLIERS } from '../../store/useStore';

const { width } = Dimensions.get('window');

const EXERCISES = [
  { id: 'pushups', name: 'Push-ups', image: require('../../../assets/images/exercises/pushup.png') },
  { id: 'squats', name: 'Air Squats', image: require('../../../assets/images/exercises/squat.png') },
  { id: 'pullups', name: 'Pull-ups', image: require('../../../assets/images/exercises/pullup.png') },
  { id: 'jumping_jacks', name: 'Jumping Jacks', image: require('../../../assets/images/exercises/jumping_jacks.png') },
  { id: 'burpees', name: 'Burpees', image: require('../../../assets/images/exercises/burpees.png') },
  { id: 'high_knees', name: 'High Knees', image: require('../../../assets/images/exercises/high_knees.png') },
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
    updateProfileName,
    todayReps,
    todayUnlocks,
    dailyReminderEnabled,
    dailyReminderTime,
    preLockWarningEnabled,
    setDailyReminderEnabled,
    setDailyReminderTime,
    setPreLockWarningEnabled,
  } = useMotusStore();
  
  // Local state
  const [sounds, setSounds] = useState(true);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [isSavingName, setIsSavingName] = useState(false);
  
  // Custom Time Picker Modal State
  const [isTimeModalVisible, setTimeModalVisible] = useState(false);
  const [pickerHours, setPickerHours] = useState(8);
  const [pickerMinutes, setPickerMinutes] = useState(0);

  // Initialize time picker values from store
  useEffect(() => {
    if (dailyReminderTime) {
      const [h, m] = dailyReminderTime.split(':').map(Number);
      setPickerHours(isNaN(h) ? 8 : h);
      setPickerMinutes(isNaN(m) ? 0 : m);
    }
  }, [dailyReminderTime, isTimeModalVisible]);

  // Reanimated slider for exercise selector
  const selectedIndex = EXERCISES.findIndex(ex => ex.id === selectedExercise);
  const tabWidth = (width - 48 - 12) / 3; // accounting for padding and gap
  const sliderTranslateX = useSharedValue(selectedIndex * tabWidth);

  useEffect(() => {
    sliderTranslateX.value = withSpring(selectedIndex * tabWidth, { 
      damping: 24, 
      stiffness: 140 
    });
  }, [selectedIndex]);

  const sliderAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderTranslateX.value }],
  }));

  // Reanimated button scale taps
  const minusScale = useSharedValue(1);
  const plusScale = useSharedValue(1);

  const minusAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: minusScale.value }] }));
  const plusAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: plusScale.value }] }));

  // Animated pulse dot for Training Mode
  const pulseValue = useSharedValue(1);
  useEffect(() => {
    pulseValue.value = withRepeat(
      withTiming(1.6, { duration: 1400 }), 
      -1, 
      false
    );
  }, []);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
    opacity: interpolate(pulseValue.value, [1, 1.6], [0.8, 0]),
  }));

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

  const saveReminderTime = async () => {
    const formattedHours = pickerHours.toString().padStart(2, '0');
    const formattedMinutes = pickerMinutes.toString().padStart(2, '0');
    const timeStr = `${formattedHours}:${formattedMinutes}`;
    await setDailyReminderTime(timeStr);
    setTimeModalVisible(false);
  };

  const incrementHour = () => setPickerHours(h => (h + 1) % 24);
  const decrementHour = () => setPickerHours(h => (h - 1 + 24) % 24);
  const incrementMinute = () => setPickerMinutes(m => (m + 5) % 60);
  const decrementMinute = () => setPickerMinutes(m => (m - 5 + 60) % 60);

  const calculatedMinutes = repCount * (EXERCISE_MULTIPLIERS[selectedExercise] || 1);

  return (
    <View style={styles.container}>
      {/* Background Ambient Glow */}
      <View style={styles.ambientGlowContainer} pointerEvents="none">
        <LinearGradient
          colors={['rgba(57, 255, 20, 0.05)', 'transparent']}
          style={styles.topAmbientGlow}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header Title */}
        <Text style={styles.header}>Settings</Text>

        {/* Premium Profile Card */}
        <LinearGradient
          colors={['#1c1c1e', '#0f1c11']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCard}
        >
          <View style={styles.profileHeaderRow}>
            <View style={styles.profileAvatarWrapper}>
              <LinearGradient
                colors={['#39FF14', '#007AFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGlowBorder}
              >
                <View style={styles.avatarInner}>
                  <SymbolView name="person.fill" size={32} tintColor="#FFFFFF" fallback={<View />} />
                </View>
              </LinearGradient>
            </View>
            
            <View style={styles.profileTextInfo}>
              <View style={styles.profileNameRow}>
                <Text style={styles.profileName} numberOfLines={1}>{user?.name || 'Guest User'}</Text>
                <TouchableOpacity 
                  style={styles.editProfileIcon}
                  onPress={() => {
                    setNewName(user?.name || '');
                    setEditModalVisible(true);
                  }}
                >
                  <SymbolView name="pencil.circle.fill" size={20} tintColor="#39FF14" fallback={<Text style={{color: '#39FF14'}}>Edit</Text>} />
                </TouchableOpacity>
              </View>
              <Text style={styles.profileEmail} numberOfLines={1}>{user?.email || 'guest@motus.fit'}</Text>
              
              <View style={styles.proBadgeContainer}>
                <LinearGradient
                  colors={['#39FF14', '#15cc00']}
                  style={styles.proBadge}
                >
                  <SymbolView name="star.fill" size={9} tintColor="#000000" fallback={<View />} />
                  <Text style={styles.proBadgeText}>PRO</Text>
                </LinearGradient>
              </View>
            </View>
          </View>

          {/* Inline Stats Dashboard */}
          <View style={styles.profileStatsDivider} />
          <View style={styles.profileStatsRow}>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>{todayReps}</Text>
              <Text style={styles.profileStatLabel}>Reps Today</Text>
            </View>
            <View style={styles.profileStatBorder} />
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>{todayUnlocks}</Text>
              <Text style={styles.profileStatLabel}>Unlocks</Text>
            </View>
            <View style={styles.profileStatBorder} />
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatValue}>{calculatedMinutes}m</Text>
              <Text style={styles.profileStatLabel}>Target Time</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Challenge Configuration Title */}
        <Text style={styles.sectionTitle}>Challenge Mechanism</Text>

        {/* Premium Segmented Exercise Selector */}
        <View style={styles.exerciseSegmentContainer}>
          <Animated.View style={[styles.exerciseSliderBg, sliderAnimatedStyle, { width: tabWidth }]} />
          {EXERCISES.map((ex) => {
            const isSelected = selectedExercise === ex.id;
            return (
              <TouchableOpacity 
                key={ex.id} 
                activeOpacity={0.8}
                style={[styles.exerciseSegmentTab, { width: tabWidth }]}
                onPress={() => setExercise(ex.id)}
              >
                <Image 
                  source={ex.image} 
                  style={[styles.exerciseSegmentIcon, isSelected ? styles.exerciseIconSelected : styles.exerciseIconDimmed]} 
                  resizeMode="contain"
                />
                <Text style={[styles.exerciseSegmentLabel, isSelected && styles.exerciseLabelSelected]}>
                  {ex.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Premium Required Reps Slider widget */}
        <View style={styles.premiumRepsCard}>
          <View style={styles.repsCardHeader}>
            <Text style={styles.repsCardTitle}>REQUIRED REPS</Text>
            <Text style={styles.repsMultiplierText}>1 rep = {EXERCISE_MULTIPLIERS[selectedExercise] || 1} min screen time</Text>
          </View>
          
          <View style={styles.repsControlRow}>
            <Animated.View style={minusAnimatedStyle}>
              <TouchableOpacity 
                style={styles.repsAdjustBtn} 
                activeOpacity={0.6}
                onPressIn={() => { minusScale.value = withTiming(0.85, { duration: 100 }); }}
                onPressOut={() => { minusScale.value = withSpring(1); }}
                onPress={() => setRepCount(Math.max(1, repCount - 1))}
              >
                <SymbolView name="minus" size={20} tintColor="#39FF14" fallback={<Text style={{color: '#39FF14'}}>-</Text>} />
              </TouchableOpacity>
            </Animated.View>
            
            <View style={styles.repsDisplayContainer}>
              <Text style={styles.repsValueText}>{repCount}</Text>
              <Text style={styles.repsValueLabel}>repetitions</Text>
            </View>

            <Animated.View style={plusAnimatedStyle}>
              <TouchableOpacity 
                style={styles.repsAdjustBtn} 
                activeOpacity={0.6}
                onPressIn={() => { plusScale.value = withTiming(0.85, { duration: 100 }); }}
                onPressOut={() => { plusScale.value = withSpring(1); }}
                onPress={() => setRepCount(repCount + 1)}
              >
                <SymbolView name="plus" size={20} tintColor="#39FF14" fallback={<Text style={{color: '#39FF14'}}>+</Text>} />
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Converted Output Badge */}
          <LinearGradient
            colors={['rgba(57, 255, 20, 0.08)', 'rgba(57, 255, 20, 0.02)']}
            style={styles.timeUnlockIndicator}
          >
            <SymbolView name="hourglass.badge.plus" size={14} tintColor="#39FF14" fallback={<View />} />
            <Text style={styles.timeUnlockText}>
              Unlocks <Text style={styles.timeUnlockBoldText}>{calculatedMinutes} minutes</Text> of screen time
            </Text>
          </LinearGradient>
        </View>

        {/* Premium Training/Positioning Card */}
        <TouchableOpacity 
          style={styles.trainingPremiumCard} 
          activeOpacity={0.9} 
          onPress={() => router.push('/camera')}
        >
          <LinearGradient
            colors={['rgba(28, 28, 30, 0.95)', 'rgba(18, 28, 19, 0.95)']}
            style={styles.trainingCardGradient}
          >
            <View style={styles.trainingLeftCol}>
              <View style={styles.trainingIconOuter}>
                <SymbolView name="camera.viewfinder" size={26} tintColor="#39FF14" fallback={<View />} />
              </View>
            </View>
            
            <View style={styles.trainingCenterCol}>
              <View style={styles.trainingTitleRow}>
                <Text style={styles.trainingCardTitle}>Training Mode</Text>
                <View style={styles.pulseContainer}>
                  <View style={styles.pulseCore} />
                  <Animated.View style={[styles.pulseRing, pulseAnimatedStyle]} />
                </View>
              </View>
              <Text style={styles.trainingCardSubtitle}>Practice positioning & check camera angles</Text>
            </View>
            
            <SymbolView name="chevron.right" size={16} tintColor="#8E8E93" fallback={<Text style={{color: '#8e8e93'}}>&gt;</Text>} />
          </LinearGradient>
        </TouchableOpacity>

        {/* App Preferences */}
        <Text style={styles.sectionTitle}>App Preferences</Text>
        <BlurView intensity={15} tint="dark" style={styles.settingsBlurBlock}>
          {/* Strict Form toggle */}
          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.prefIconContainer, { backgroundColor: 'rgba(57, 255, 20, 0.1)' }]}>
                <SymbolView name="figure.stand.line.dotted.figure.stand" size={18} tintColor="#39FF14" fallback={<View />} />
              </View>
              <View style={styles.prefTextContainer}>
                <Text style={styles.prefTitle}>Strict Form Checking</Text>
                <Text style={styles.prefDesc}>Requires complete range of motion for reps to count.</Text>
              </View>
            </View>
            <Switch 
              value={strictMode} 
              onValueChange={setStrictMode} 
              trackColor={{ false: '#3a3a3c', true: '#39FF14' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.separatorLine} />

          {/* Sound Effects toggle */}
          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.prefIconContainer, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                <SymbolView name="speaker.wave.2.fill" size={18} tintColor="#007AFF" fallback={<View />} />
              </View>
              <View style={styles.prefTextContainer}>
                <Text style={styles.prefTitle}>Sound Effects</Text>
                <Text style={styles.prefDesc}>Plays beep indicator when a rep is counted.</Text>
              </View>
            </View>
            <Switch 
              value={sounds} 
              onValueChange={setSounds} 
              trackColor={{ false: '#3a3a3c', true: '#39FF14' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </BlurView>

        {/* Notifications & Reminders Section */}
        <Text style={styles.sectionTitle}>Notifications & Reminders</Text>
        <BlurView intensity={15} tint="dark" style={styles.settingsBlurBlock}>
          {/* Daily reminder toggle */}
          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.prefIconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                <SymbolView name="bell.fill" size={18} tintColor="#FF9500" fallback={<View />} />
              </View>
              <View style={styles.prefTextContainer}>
                <Text style={styles.prefTitle}>Daily Workout Reminder</Text>
                <Text style={styles.prefDesc}>Reminds you to unlock your screen time.</Text>
              </View>
            </View>
            <Switch 
              value={dailyReminderEnabled} 
              onValueChange={setDailyReminderEnabled} 
              trackColor={{ false: '#3a3a3c', true: '#39FF14' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Reminder Time selector (Only visible if enabled) */}
          {dailyReminderEnabled && (
            <>
              <View style={styles.separatorLine} />
              <TouchableOpacity 
                style={styles.prefRowClickable} 
                activeOpacity={0.7}
                onPress={() => setTimeModalVisible(true)}
              >
                <View style={styles.prefLeft}>
                  <View style={[styles.prefIconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                    <SymbolView name="clock.fill" size={18} tintColor="#FF9500" fallback={<View />} />
                  </View>
                  <View style={styles.prefTextContainer}>
                    <Text style={styles.prefTitle}>Reminder Time</Text>
                    <Text style={styles.prefDesc}>Select when to be nudged daily.</Text>
                  </View>
                </View>
                <View style={styles.timeSelectorValueBadge}>
                  <Text style={styles.timeSelectorValueText}>{dailyReminderTime}</Text>
                  <SymbolView name="chevron.right" size={14} tintColor="#8E8E93" fallback={<Text style={{color: '#666'}}>&gt;</Text>} />
                </View>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.separatorLine} />

          {/* Pre-Lock Warning Toggle */}
          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.prefIconContainer, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                <SymbolView name="timer" size={18} tintColor="#FF3B30" fallback={<View />} />
              </View>
              <View style={styles.prefTextContainer}>
                <Text style={styles.prefTitle}>Pre-Lock Warning</Text>
                <Text style={styles.prefDesc}>Alerts 5m before screen time ends.</Text>
              </View>
            </View>
            <Switch 
              value={preLockWarningEnabled} 
              onValueChange={setPreLockWarningEnabled} 
              trackColor={{ false: '#3a3a3c', true: '#39FF14' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </BlurView>

        {/* Support & Legal */}
        <Text style={styles.sectionTitle}>Support & About</Text>
        <BlurView intensity={15} tint="dark" style={styles.settingsBlurBlock}>
          <TouchableOpacity style={styles.supportRow} activeOpacity={0.7}>
            <View style={styles.prefLeft}>
              <View style={styles.supportIconContainer}>
                <SymbolView name="questionmark.circle.fill" size={18} tintColor="#8E8E93" fallback={<View />} />
              </View>
              <Text style={styles.supportTitle}>Help & FAQ</Text>
            </View>
            <SymbolView name="chevron.right" size={16} tintColor="#666666" fallback={<Text style={{color: '#666'}}>&gt;</Text>} />
          </TouchableOpacity>

          <View style={styles.separatorLine} />

          <TouchableOpacity style={styles.supportRow} activeOpacity={0.7}>
            <View style={styles.prefLeft}>
              <View style={styles.supportIconContainer}>
                <SymbolView name="envelope.fill" size={18} tintColor="#8E8E93" fallback={<View />} />
              </View>
              <Text style={styles.supportTitle}>Contact Us</Text>
            </View>
            <SymbolView name="chevron.right" size={16} tintColor="#666666" fallback={<Text style={{color: '#666'}}>&gt;</Text>} />
          </TouchableOpacity>

          <View style={styles.separatorLine} />

          <TouchableOpacity style={styles.supportRow} activeOpacity={0.7}>
            <View style={styles.prefLeft}>
              <View style={styles.supportIconContainer}>
                <SymbolView name="doc.text.fill" size={18} tintColor="#8E8E93" fallback={<View />} />
              </View>
              <Text style={styles.supportTitle}>Privacy Policy</Text>
            </View>
            <SymbolView name="chevron.right" size={16} tintColor="#666666" fallback={<Text style={{color: '#666'}}>&gt;</Text>} />
          </TouchableOpacity>
        </BlurView>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButtonPremium} activeOpacity={0.8} onPress={handleSignOut}>
          <LinearGradient
            colors={['rgba(255, 59, 48, 0.08)', 'rgba(255, 59, 48, 0.03)']}
            style={styles.signOutGradient}
          >
            <SymbolView name="power" size={18} tintColor="#FF3B30" fallback={<View />} />
            <Text style={styles.signOutTextPremium}>Sign Out Account</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isEditModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <BlurView intensity={70} tint="dark" style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Update Profile Name</Text>
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
                style={[styles.modalButton as any, styles.modalCancelBtn as any]} 
                onPress={() => setEditModalVisible(false)}
                disabled={isSavingName}
              >
                <Text style={styles.modalCancelText as any}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton as any, styles.modalSaveBtn as any]} 
                onPress={handleSaveName}
                disabled={isSavingName}
              >
                {isSavingName ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text style={styles.modalSaveText as any}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Custom Time Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isTimeModalVisible}
        onRequestClose={() => setTimeModalVisible(false)}
      >
        <BlurView intensity={75} tint="dark" style={styles.modalBackground}>
          <View style={styles.timeModalContainer}>
            <Text style={styles.timeModalTitle}>Daily Reminder Time</Text>
            <Text style={styles.timeModalSubtitle}>Set a consistent target reminder</Text>

            {/* Custom Hour/Minute Adjuster */}
            <View style={styles.timeAdjusterContainer}>
              {/* Hour Column */}
              <View style={styles.timeAdjusterCol}>
                <TouchableOpacity style={styles.timeArrowBtn} onPress={incrementHour}>
                  <SymbolView name="chevron.up" size={24} tintColor="#39FF14" fallback={<Text style={{color: 'white'}}>^</Text>} />
                </TouchableOpacity>
                <Text style={styles.timeAdjusterValue}>{pickerHours.toString().padStart(2, '0')}</Text>
                <TouchableOpacity style={styles.timeArrowBtn} onPress={decrementHour}>
                  <SymbolView name="chevron.down" size={24} tintColor="#39FF14" fallback={<Text style={{color: 'white'}}>v</Text>} />
                </TouchableOpacity>
                <Text style={styles.timeAdjusterLabel}>hours</Text>
              </View>

              {/* Time separator */}
              <Text style={styles.timeAdjusterSeparator}>:</Text>

              {/* Minute Column */}
              <View style={styles.timeAdjusterCol}>
                <TouchableOpacity style={styles.timeArrowBtn} onPress={incrementMinute}>
                  <SymbolView name="chevron.up" size={24} tintColor="#39FF14" fallback={<Text style={{color: 'white'}}>^</Text>} />
                </TouchableOpacity>
                <Text style={styles.timeAdjusterValue}>{pickerMinutes.toString().padStart(2, '0')}</Text>
                <TouchableOpacity style={styles.timeArrowBtn} onPress={decrementMinute}>
                  <SymbolView name="chevron.down" size={24} tintColor="#39FF14" fallback={<Text style={{color: 'white'}}>v</Text>} />
                </TouchableOpacity>
                <Text style={styles.timeAdjusterLabel}>mins</Text>
              </View>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity 
                style={[styles.modalButton as any, styles.modalCancelBtn as any]} 
                onPress={() => setTimeModalVisible(false)}
              >
                <Text style={styles.modalCancelText as any}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton as any, styles.modalSaveBtn as any]} 
                onPress={saveReminderTime}
              >
                <Text style={styles.modalSaveText as any}>Confirm</Text>
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
    backgroundColor: '#050505',
  },
  ambientGlowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    zIndex: 0,
  },
  topAmbientGlow: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 24,
    paddingTop: 80,
    paddingBottom: 120,
    zIndex: 1,
  },
  header: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  // Profile Hero Card Style
  profileCard: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatarWrapper: {
    marginRight: 20,
  },
  avatarGlowBorder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2.5,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileTextInfo: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginRight: 6,
    letterSpacing: -0.2,
  },
  editProfileIcon: {
    padding: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 10,
  },
  proBadgeContainer: {
    alignSelf: 'flex-start',
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  proBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 4,
    letterSpacing: 1.0,
  },
  profileStatsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 20,
  },
  profileStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  profileStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  profileStatValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  profileStatLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileStatBorder: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#636366',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 2.0,
    marginLeft: 4,
  },
  // Unified exercise segment styles
  exerciseSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1e',
    borderRadius: 24,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  exerciseSliderBg: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(57, 255, 20, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(57, 255, 20, 0.3)',
  },
  exerciseSegmentTab: {
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  exerciseSegmentIcon: {
    width: 38,
    height: 38,
    borderRadius: 6,
    marginBottom: 8,
  },
  exerciseIconDimmed: {
    opacity: 0.35,
  },
  exerciseIconSelected: {
    opacity: 1,
  },
  exerciseSegmentLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
  },
  exerciseLabelSelected: {
    color: '#39FF14',
  },
  // Premium Reps widget styles
  premiumRepsCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 28,
    padding: 24,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  repsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  repsCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 1.2,
  },
  repsMultiplierText: {
    fontSize: 11,
    color: '#39FF14',
    fontWeight: '600',
  },
  repsControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  repsAdjustBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  repsDisplayContainer: {
    alignItems: 'center',
  },
  repsValueText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  repsValueLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636366',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    marginTop: -2,
  },
  timeUnlockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 20, 0.15)',
  },
  timeUnlockText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
  timeUnlockBoldText: {
    color: '#39FF14',
    fontWeight: '800',
  },
  // Premium Training card styles
  trainingPremiumCard: {
    borderRadius: 28,
    marginBottom: 36,
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 20, 0.2)',
    overflow: 'hidden',
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  trainingCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  trainingLeftCol: {
    marginRight: 16,
  },
  trainingIconOuter: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(57, 255, 20, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trainingCenterCol: {
    flex: 1,
  },
  trainingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  trainingCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginRight: 8,
  },
  trainingCardSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  pulseContainer: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#39FF14',
    zIndex: 2,
  },
  pulseRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#39FF14',
    zIndex: 1,
  },
  // Settings group items
  settingsBlurBlock: {
    borderRadius: 28,
    backgroundColor: 'rgba(28, 28, 30, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 36,
    overflow: 'hidden',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  prefRowClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 16,
  },
  prefIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  prefTextContainer: {
    flex: 1,
  },
  prefTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  prefDesc: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
  timeSelectorValueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  timeSelectorValueText: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 6,
  },
  separatorLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginLeft: 76,
  },
  // Support row
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    paddingHorizontal: 20,
  },
  supportIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Sign out premium
  signOutButtonPremium: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.15)',
    marginBottom: 60,
  },
  signOutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  signOutTextPremium: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  // Modals generic style
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: '#1C1C1E',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
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
    height: 56,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 0.47,
    height: 52,
    borderRadius: 26,
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
  // Custom Time Picker Modal styles
  timeModalContainer: {
    width: width * 0.85,
    backgroundColor: '#1C1C1E',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  timeModalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  timeModalSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 24,
    textAlign: 'center',
  },
  timeAdjusterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    paddingVertical: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  timeAdjusterCol: {
    alignItems: 'center',
    width: 80,
  },
  timeArrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  timeAdjusterValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 10,
    letterSpacing: -1,
  },
  timeAdjusterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#636366',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeAdjusterSeparator: {
    fontSize: 44,
    fontWeight: '800',
    color: '#39FF14',
    marginHorizontal: 12,
    marginTop: -28,
  },
});
