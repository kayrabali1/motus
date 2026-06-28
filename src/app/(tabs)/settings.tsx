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
let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  console.log('expo-image-picker native module is not loaded yet');
}

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
    updateProfileAvatar,
    appRelockAlertEnabled,
    setAppRelockAlertEnabled,
    setProMember,
  } = useMotusStore();
  
  // Local state
  const [sounds, setSounds] = useState(true);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isPaywallVisible, setPaywallVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  
  // Training Mode Modal State
  const [isTrainingModalVisible, setTrainingModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubscribe = async () => {
    setPaywallVisible(false);
    await setProMember(true);
    Alert.alert(
      "Welcome to Motus Pro! 🎉",
      "Your 7-day free trial is active. You can now lock unlimited apps and create schedules.",
      [{ text: "Awesome!" }]
    );
  };

  const handlePickAvatar = async () => {
    if (!ImagePicker) {
      Alert.alert(
        "Rebuild Required",
        "Uploading an avatar requires a new native module. Please run 'npx expo run:ios' (or 'npx expo run:android') in your terminal to rebuild the development container and activate this feature."
      );
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Required", "Please grant access to your photo library to upload an avatar.");
      return;
    }

    Alert.alert(
      "Update Avatar",
      "Select an option to update your profile photo:",
      [
        {
          text: "Choose from Library",
          onPress: async () => {
            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.35,
                base64: true,
              });

              if (!result.canceled && result.assets && result.assets[0].base64) {
                setIsUploading(true);
                const base64Str = `data:image/jpeg;base64,${result.assets[0].base64}`;
                const success = await updateProfileAvatar(base64Str);
                setIsUploading(false);
                if (!success) {
                  Alert.alert("Error", "Failed to upload avatar photo.");
                }
              }
            } catch (e) {
              console.log("Failed to launch image library", e);
              setIsUploading(false);
            }
          }
        },
        {
          text: "Take Photo",
          onPress: async () => {
            const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
            if (cameraStatus.status !== 'granted') {
              Alert.alert("Permission Required", "Please grant camera access to take a profile photo.");
              return;
            }
            try {
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.35,
                base64: true,
              });

              if (!result.canceled && result.assets && result.assets[0].base64) {
                setIsUploading(true);
                const base64Str = `data:image/jpeg;base64,${result.assets[0].base64}`;
                const success = await updateProfileAvatar(base64Str);
                setIsUploading(false);
                if (!success) {
                  Alert.alert("Error", "Failed to upload avatar photo.");
                }
              }
            } catch (e) {
              console.log("Failed to launch camera", e);
              setIsUploading(false);
            }
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  // Training Mode Modal dimensions
  const modalWidth = width * 0.88;

  // Reanimated button scale taps inside training modal
  const minusScale = useSharedValue(1);
  const plusScale = useSharedValue(1);

  const minusAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: minusScale.value }] }));
  const plusAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: plusScale.value }] }));

  // Animated pulse dot for Training Mode Card
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

  const calculatedMinutes = repCount * (EXERCISE_MULTIPLIERS[selectedExercise] || 1);

  return (
    <View style={styles.container}>
      {/* Background Ambient Glows - Matching Dashboard */}
      <View style={styles.ambientGlowGreen} />
      <View style={styles.ambientGlowBlue} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header - Matching Dashboard */}
        <View style={styles.headerContainer}>
          <Text style={styles.dateText}>CONFIG & PREFERENCES</Text>
          <Text style={styles.header}>Settings</Text>
        </View>

        {/* Profile Card (Simplified - No stats) - Matching Dashboard Hero style */}
        <View style={styles.heroWrapper}>
          <BlurView intensity={30} style={styles.profileCard} tint="dark">
            <View style={styles.profileHeaderRow}>
              <TouchableOpacity 
                style={styles.profileAvatarWrapper} 
                activeOpacity={0.8} 
                onPress={handlePickAvatar}
                disabled={isUploading}
              >
                <LinearGradient
                  colors={['#39FF14', '#007AFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarGlowBorder}
                >
                  <View style={styles.avatarInner}>
                    {isUploading ? (
                      <ActivityIndicator size="small" color="#39FF14" />
                    ) : user?.avatarUrl ? (
                      <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
                    ) : (
                      <SymbolView name="person.fill" size={32} tintColor="#FFFFFF" fallback={<View />} />
                    )}
                  </View>
                </LinearGradient>
                <View style={styles.avatarUploadBadge}>
                  <SymbolView name="camera.fill" size={10} tintColor="#000000" />
                </View>
              </TouchableOpacity>
              
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
                
                {user?.proMember && (
                  <View style={styles.proBadgeContainer}>
                    <LinearGradient
                      colors={['#39FF14', '#15cc00']}
                      style={styles.proBadge}
                    >
                      <SymbolView name="star.fill" size={9} tintColor="#000000" fallback={<View />} />
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </LinearGradient>
                  </View>
                )}
              </View>
            </View>
          </BlurView>
        </View>

        {!user?.proMember && (
          <TouchableOpacity 
            style={styles.upgradeCardContainer} 
            activeOpacity={0.9}
            onPress={() => setPaywallVisible(true)}
          >
            <LinearGradient
              colors={['rgba(57, 255, 20, 0.15)', 'rgba(0, 122, 255, 0.15)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.upgradeCard}
            >
              <View style={styles.upgradeCardLeft}>
                <View style={styles.upgradeIconContainer}>
                  <SymbolView name="sparkles" size={24} tintColor="#39FF14" fallback={<View />} />
                </View>
                <View style={styles.upgradeTextContainer}>
                  <Text style={styles.upgradeCardTitle}>Upgrade to Motus Pro</Text>
                  <Text style={styles.upgradeCardSubtitle}>Lock unlimited apps and configure schedules</Text>
                </View>
              </View>
              <SymbolView name="chevron.right" size={16} tintColor="#39FF14" fallback={<Text style={{color: '#39FF14'}}>&gt;</Text>} />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Practice Mode Header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Training & Practice</Text>
            <Text style={styles.sectionSubtitle}>Test your body form and setup angles</Text>
          </View>
          <SymbolView name="figure.cooldown" size={20} tintColor="#39FF14" />
        </View>

        {/* Premium Training/Positioning Card - Tapping opens configuration modal */}
        <TouchableOpacity 
          style={styles.trainingPremiumCard} 
          activeOpacity={0.9} 
          onPress={() => setTrainingModalVisible(true)}
        >
          <BlurView intensity={30} style={styles.trainingCardGradient} tint="dark">
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
          </BlurView>
        </TouchableOpacity>

        {/* App Preferences Section Header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>App Preferences</Text>
            <Text style={styles.sectionSubtitle}>Fine-tune your workout tracking rules</Text>
          </View>
          <SymbolView name="gearshape.fill" size={20} tintColor="#007AFF" />
        </View>

        <BlurView intensity={20} tint="dark" style={styles.settingsBlurBlock}>
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

        {/* Notifications & Reminders Section Header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Notifications & Reminders</Text>
            <Text style={styles.sectionSubtitle}>Get alert warnings and system statuses</Text>
          </View>
          <SymbolView name="bell.fill" size={20} tintColor="#FF9500" />
        </View>

        <BlurView intensity={20} tint="dark" style={styles.settingsBlurBlock}>
          {/* App Relocked Alert Toggle */}
          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.prefIconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                <SymbolView name="lock.fill" size={18} tintColor="#FF9500" fallback={<View />} />
              </View>
              <View style={styles.prefTextContainer}>
                <Text style={styles.prefTitle}>App Relocked Alerts</Text>
                <Text style={styles.prefDesc}>Get notified when screen time ends and apps relock.</Text>
              </View>
            </View>
            <Switch 
              value={appRelockAlertEnabled} 
              onValueChange={setAppRelockAlertEnabled} 
              trackColor={{ false: '#3a3a3c', true: '#39FF14' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </BlurView>

        {/* Support & Legal Section Header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Support & About</Text>
            <Text style={styles.sectionSubtitle}>Need help or want to read legal info?</Text>
          </View>
          <SymbolView name="questionmark.circle.fill" size={20} tintColor="#8E8E93" />
        </View>

        <BlurView intensity={20} tint="dark" style={styles.settingsBlurBlock}>
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

        {user?.proMember && (
          <TouchableOpacity 
            style={[styles.signOutButtonPremium, { marginBottom: 12 }]} 
            activeOpacity={0.8} 
            onPress={async () => {
              await setProMember(false);
              Alert.alert("Downgraded", "You are now on the Free tier.");
            }}
          >
            <LinearGradient
              colors={['rgba(255, 59, 48, 0.08)', 'rgba(255, 59, 48, 0.03)']}
              style={styles.signOutGradient}
            >
              <SymbolView name="arrow.down.right.circle.fill" size={18} tintColor="#FF3B30" fallback={<View />} />
              <Text style={styles.signOutTextPremium}>Downgrade to Free (Demo)</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

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

      {/* Custom Training Configuration Pop-up Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isTrainingModalVisible}
        onRequestClose={() => setTrainingModalVisible(false)}
      >
        <BlurView intensity={80} tint="dark" style={styles.modalBackground}>
          <View style={[styles.timeModalContainer, { width: modalWidth }]}>
            <Text style={styles.timeModalTitle}>Practice Configuration</Text>
            <Text style={styles.timeModalSubtitle}>Set up your exercise type and reps</Text>

            {/* Exercise Selector inside popup (Grid of 6 items) */}
            <View style={[styles.exerciseGrid, { width: modalWidth - 48, marginBottom: 20 }]}>
              {EXERCISES.map((ex) => {
                const isSelected = selectedExercise === ex.id;
                return (
                  <TouchableOpacity 
                    key={ex.id} 
                    activeOpacity={0.8}
                    style={[styles.exerciseGridItem, isSelected && styles.exerciseGridItemActive]}
                    onPress={() => setExercise(ex.id)}
                  >
                    <Image 
                      source={ex.image} 
                      style={[styles.exerciseGridIcon, isSelected ? styles.exerciseIconSelected : styles.exerciseIconDimmed]} 
                      resizeMode="contain"
                    />
                    <Text style={[styles.exerciseGridLabel, isSelected && styles.exerciseLabelSelected]}>
                      {ex.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Required Reps Widget inside popup */}
            <View style={[styles.premiumRepsCard, { width: modalWidth - 48, marginBottom: 24, backgroundColor: 'rgba(255,255,255,0.02)' }]}>
              <View style={styles.repsCardHeader}>
                <Text style={styles.repsCardTitle}>REQUIRED REPS</Text>
                <Text style={styles.repsMultiplierText}>1 rep = {EXERCISE_MULTIPLIERS[selectedExercise] || 1}m screen time</Text>
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

              {/* Converted Output badge */}
              <View style={styles.timeUnlockIndicator}>
                <SymbolView name="hourglass.badge.plus" size={14} tintColor="#39FF14" fallback={<View />} />
                <Text style={styles.timeUnlockText}>
                  Unlocks <Text style={styles.timeUnlockBoldText}>{calculatedMinutes} minutes</Text> of screen time
                </Text>
              </View>
            </View>

            {/* Modal Buttons Row */}
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity 
                style={[styles.modalButton as any, styles.modalCancelBtn as any]} 
                onPress={() => setTrainingModalVisible(false)}
              >
                <Text style={styles.modalCancelText as any}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton as any, styles.modalSaveBtn as any]} 
                onPress={() => {
                  setTrainingModalVisible(false);
                  router.push('/camera');
                }}
              >
                <Text style={styles.modalSaveText as any}>Start Practice</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Paywall Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isPaywallVisible}
        onRequestClose={() => setPaywallVisible(false)}
      >
        <BlurView intensity={90} tint="dark" style={styles.paywallBackground}>
          <View style={styles.paywallContainer}>
            {/* Close button */}
            <TouchableOpacity 
              style={styles.paywallCloseBtn} 
              onPress={() => setPaywallVisible(false)}
            >
              <SymbolView name="xmark.circle.fill" size={28} tintColor="#8E8E93" fallback={<Text style={{color: '#8e8e93', fontSize: 24}}>X</Text>} />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.paywallScrollContent} showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.paywallHeader}>
                <LinearGradient
                  colors={['#39FF14', '#007AFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.paywallBadge}
                >
                  <Text style={styles.paywallBadgeText}>MOTUS PRO</Text>
                </LinearGradient>
                <Text style={styles.paywallTitle}>Smarter Focus. Harder Workouts.</Text>
                <Text style={styles.paywallSubtitle}>Form unbreakable habits and unlock full productivity.</Text>
              </View>

              {/* Features List */}
              <View style={styles.featuresList}>
                <View style={styles.featureRow}>
                  <SymbolView name="checkmark.circle.fill" size={20} tintColor="#39FF14" fallback={<Text style={{color: '#39FF14'}}>✓</Text>} />
                  <View style={styles.featureTextCol}>
                    <Text style={styles.featureTitle}>Lock Unlimited Apps</Text>
                    <Text style={styles.featureDesc}>Prevent replacing one distraction with another.</Text>
                  </View>
                </View>

                <View style={styles.featureRow}>
                  <SymbolView name="checkmark.circle.fill" size={20} tintColor="#39FF14" fallback={<Text style={{color: '#39FF14'}}>✓</Text>} />
                  <View style={styles.featureTextCol}>
                    <Text style={styles.featureTitle}>Automated Lock Schedules</Text>
                    <Text style={styles.featureDesc}>Automatically lock apps during work, study, or sleep.</Text>
                  </View>
                </View>

                <View style={styles.featureRow}>
                  <SymbolView name="checkmark.circle.fill" size={20} tintColor="#39FF14" fallback={<Text style={{color: '#39FF14'}}>✓</Text>} />
                  <View style={styles.featureTextCol}>
                    <Text style={styles.featureTitle}>Strict Mode Included</Text>
                    <Text style={styles.featureDesc}>No easy bypasses. Force workouts to access apps.</Text>
                  </View>
                </View>

                <View style={styles.featureRow}>
                  <SymbolView name="checkmark.circle.fill" size={20} tintColor="#39FF14" fallback={<Text style={{color: '#39FF14'}}>✓</Text>} />
                  <View style={styles.featureTextCol}>
                    <Text style={styles.featureTitle}>All Exercises & Forms</Text>
                    <Text style={styles.featureDesc}>Access burpees, pull-ups, jumping jacks, and stats.</Text>
                  </View>
                </View>
              </View>

              {/* Pricing selector */}
              <Text style={styles.selectPlanTitle}>Select Your Plan</Text>
              <View style={styles.plansContainer}>
                {/* Annual Plan */}
                <TouchableOpacity 
                  style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
                  onPress={() => setSelectedPlan('annual')}
                  activeOpacity={0.8}
                >
                  <View style={styles.planCardHeader}>
                    <Text style={styles.planName}>Annual Access</Text>
                    <View style={styles.bestValueBadge}>
                      <Text style={styles.bestValueText}>BEST VALUE</Text>
                    </View>
                  </View>
                  <Text style={styles.planPrice}>€49.99 <Text style={styles.planPeriod}>/ year</Text></Text>
                  <Text style={styles.planDetail}>Only €4.16/month (Save 58%)</Text>
                </TouchableOpacity>

                {/* Monthly Plan */}
                <TouchableOpacity 
                  style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
                  onPress={() => setSelectedPlan('monthly')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.planName}>Monthly Access</Text>
                  <Text style={styles.planPrice}>€9.99 <Text style={styles.planPeriod}>/ month</Text></Text>
                  <Text style={styles.planDetail}>Cancel anytime</Text>
                </TouchableOpacity>
              </View>

              {/* Purchase Button */}
              <TouchableOpacity 
                style={styles.subscribeBtn} 
                activeOpacity={0.8}
                onPress={handleSubscribe}
              >
                <Text style={styles.subscribeBtnText}>Start 7-Day Free Trial</Text>
              </TouchableOpacity>

              <Text style={styles.disclaimerText}>
                No payment will be charged today. Your 7-day trial of Motus Pro will begin immediately. You can cancel at any time in your App Store Settings. Prices include VAT where applicable.
              </Text>
            </ScrollView>
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
  // Ambient glows matching dashboard (index.tsx)
  ambientGlowGreen: {
    position: 'absolute',
    top: 50,
    left: -120,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#39FF14',
    opacity: 0.08,
    zIndex: 0,
  },
  ambientGlowBlue: {
    position: 'absolute',
    top: 350,
    right: -120,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: '#007AFF',
    opacity: 0.06,
    zIndex: 0,
  },
  content: {
    padding: 24,
    paddingTop: 80,
    paddingBottom: 140,
    zIndex: 1,
  },
  headerContainer: {
    marginBottom: 32,
  },
  dateText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  header: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  // Profile Hero Blur Card Style - Matching Dashboard Hero Card
  heroWrapper: {
    marginBottom: 40,
    borderRadius: 32,
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 8,
  },
  profileCard: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
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
  },
  proBadgeContainer: {
    alignSelf: 'flex-start',
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginTop: 10,
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
  // Section Headers - Matching Dashboard section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    marginTop: 4,
  },
  // Unified exercise grid styles
  exerciseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  exerciseGridItem: {
    width: (width * 0.88 - 48 - 16) / 3, // modalWidth - padding - double gaps
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  exerciseGridItemActive: {
    borderColor: '#39FF14',
    borderWidth: 1.5,
    backgroundColor: 'rgba(57, 255, 20, 0.08)',
  },
  exerciseGridIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginBottom: 6,
  },
  exerciseIconDimmed: {
    opacity: 0.35,
  },
  exerciseIconSelected: {
    opacity: 1,
  },
  exerciseGridLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
  },
  exerciseLabelSelected: {
    color: '#39FF14',
  },
  // Premium Reps widget styles - Styled like chartCard
  premiumRepsCard: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
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
    backgroundColor: 'rgba(57, 255, 20, 0.04)',
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
  // Premium Training card styles - Styled like timelineCard
  trainingPremiumCard: {
    borderRadius: 28,
    marginBottom: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
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
  // Settings group items - Styled like timelineCard
  settingsBlurBlock: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
  // Custom Time Picker Modal styles (Used as generic config container)
  timeModalContainer: {
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
    alignItems: 'center',
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
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  avatarUploadBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#39FF14',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  upgradeCardContainer: {
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 20, 0.25)',
  },
  upgradeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  upgradeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(57, 255, 20, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  upgradeTextContainer: {
    flex: 1,
  },
  upgradeCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  upgradeCardSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  paywallBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paywallContainer: {
    backgroundColor: '#1c1c1e',
    width: '90%',
    height: '82%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    paddingTop: 16,
  },
  paywallCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  paywallScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  paywallHeader: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  paywallBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  paywallBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  paywallTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  paywallSubtitle: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  featuresList: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  featureTextCol: {
    marginLeft: 12,
    flex: 1,
  },
  featureTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  featureDesc: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  selectPlanTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  plansContainer: {
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  planCardSelected: {
    borderColor: '#39FF14',
    backgroundColor: 'rgba(57, 255, 20, 0.04)',
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bestValueBadge: {
    backgroundColor: '#39FF14',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bestValueText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
  },
  planPrice: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  planPeriod: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  planDetail: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 4,
  },
  subscribeBtn: {
    backgroundColor: '#39FF14',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 4,
  },
  subscribeBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
  disclaimerText: {
    color: '#666',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
});
