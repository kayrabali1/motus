import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Your Impact</Text>
          <Text style={styles.subtitle}>You&apos;re an absolute machine! 🔥</Text>
        </View>

        {/* Hero Card */}
        <View style={styles.heroWrapper}>
          <View style={styles.heroGradient}>
            {/* Mesh Gradient Background */}
            <View style={{ position: 'absolute', top: -50, left: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: '#FF2D55', opacity: 0.8 }} />
            <View style={{ position: 'absolute', bottom: -50, right: -50, width: 250, height: 250, borderRadius: 125, backgroundColor: '#5856D6', opacity: 0.8 }} />
            <View style={{ position: 'absolute', top: 50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: '#007AFF', opacity: 0.7 }} />
            <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
            
            <View style={styles.heroContent}>
              <View style={styles.heroTopRow}>
                <SymbolView name="flame.fill" size={36} tintColor="#FFF" fallback={<View style={{width: 36, height: 36}}/>} />
                <Text style={styles.streakText}>12 Day Streak</Text>
              </View>
              <Text style={styles.heroValue}>340</Text>
              <Text style={styles.heroLabel}>TOTAL REPS</Text>
            </View>
          </View>
        </View>

        {/* Wall of Fame (Leaderboard) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Who&apos;s Making You Work?</Text>
          <SymbolView name="trophy.fill" size={24} tintColor="#FFD60A" fallback={<View style={{width: 24, height: 24}}/>} />
        </View>

        <View style={styles.leaderboardContainer}>
          {/* App 1 */}
          <BlurView intensity={20} style={styles.appCard} tint="light">
            <View style={styles.appIconBg}>
              <SymbolView name="camera.macro" size={28} tintColor="#FF2D55" fallback={<View style={{width: 28, height: 28}}/>} />
            </View>
            <View style={styles.appInfo}>
              <Text style={styles.appName}>Instagram</Text>
              <Text style={styles.appDetail}>150 Reps • 44%</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '44%', backgroundColor: '#FF2D55' }]} />
              </View>
            </View>
          </BlurView>

          {/* App 2 */}
          <BlurView intensity={20} style={styles.appCard} tint="light">
            <View style={styles.appIconBg}>
              <SymbolView name="play.rectangle.fill" size={28} tintColor="#39FF14" fallback={<View style={{width: 28, height: 28}}/>} />
            </View>
            <View style={styles.appInfo}>
              <Text style={styles.appName}>TikTok</Text>
              <Text style={styles.appDetail}>120 Reps • 35%</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '35%', backgroundColor: '#39FF14' }]} />
              </View>
            </View>
          </BlurView>

          {/* App 3 */}
          <BlurView intensity={20} style={styles.appCard} tint="light">
            <View style={styles.appIconBg}>
              <SymbolView name="bubble.left.and.bubble.right.fill" size={28} tintColor="#007AFF" fallback={<View style={{width: 28, height: 28}}/>} />
            </View>
            <View style={styles.appInfo}>
              <Text style={styles.appName}>Messages</Text>
              <Text style={styles.appDetail}>70 Reps • 21%</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '21%', backgroundColor: '#007AFF' }]} />
              </View>
            </View>
          </BlurView>
        </View>

        {/* Fun Facts */}
        <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Did You Know?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.factsScroll}>
          <View style={[styles.factCard, { backgroundColor: 'rgba(255,45,85,0.1)' }]}>
            <SymbolView name="bolt.heart.fill" size={32} tintColor="#FF2D55" style={{marginBottom: 12}} fallback={<View style={{width: 32, height: 32}}/>} />
            <Text style={styles.factText}>Instagram owes you 150 squats!</Text>
          </View>

          <View style={[styles.factCard, { backgroundColor: 'rgba(57,255,20,0.1)' }]}>
            <SymbolView name="car.fill" size={32} tintColor="#39FF14" style={{marginBottom: 12}} fallback={<View style={{width: 32, height: 32}}/>} />
            <Text style={styles.factText}>You&apos;ve lifted the equivalent of a small car.</Text>
          </View>
          
          <View style={[styles.factCard, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
            <SymbolView name="drop.fill" size={32} tintColor="#007AFF" style={{marginBottom: 12}} fallback={<View style={{width: 32, height: 32}}/>} />
            <Text style={styles.factText}>TikTok made you sweat 40% more this week.</Text>
          </View>
        </ScrollView>

      </ScrollView>
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
    paddingBottom: 140,
  },
  headerContainer: {
    marginBottom: 32,
  },
  header: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: '#8E8E93',
    marginTop: 4,
    fontWeight: '500',
  },
  heroWrapper: {
    marginBottom: 40,
    shadowColor: '#5856D6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  heroGradient: {
    borderRadius: 32,
    padding: 24,
    minHeight: 180,
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E', // Base dark color before BlurView
    overflow: 'hidden',
  },
  heroContent: {
    flex: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroValue: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 80,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  heroLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  leaderboardContainer: {
    marginBottom: 40,
  },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  appIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  appDetail: {
    fontSize: 14,
    color: '#A1A1AA',
    marginBottom: 8,
    fontWeight: '500',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  factsScroll: {
    paddingRight: 24,
    paddingBottom: 20,
  },
  factCard: {
    width: width * 0.6,
    padding: 20,
    borderRadius: 24,
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  factText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 24,
  },
});
