import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { useMotusStore } from '../../store/useStore';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { 
    todayReps, 
    todayCalories, 
    todayUnlocks, 
    activityLogs, 
    fetchStatsAndActivity, 
    token, 
    user 
  } = useMotusStore();

  useEffect(() => {
    if (token) {
      fetchStatsAndActivity();
    }
  }, [token]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.greeting}>
            {user ? `Hey, ${user.name}` : 'Hey there'}
          </Text>
          <Text style={styles.header}>Dashboard</Text>
        </View>

        {/* Hero Card */}
        <View style={styles.heroWrapper}>
          <View style={styles.heroGradient}>
            {/* Mesh Gradient Background — subtle greens/teals */}
            <View style={{ position: 'absolute', top: -60, left: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: '#39FF14', opacity: 0.25 }} />
            <View style={{ position: 'absolute', bottom: -60, right: -60, width: 250, height: 250, borderRadius: 125, backgroundColor: '#0A8454', opacity: 0.35 }} />
            <View style={{ position: 'absolute', top: 40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: '#00C9A7', opacity: 0.2 }} />
            <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
            
            <View style={styles.heroContent}>
              <View style={styles.heroTopRow}>
                <View style={styles.pillBadge}>
                  <SymbolView name="figure.run" size={14} tintColor="#39FF14" fallback={<View style={{width: 14, height: 14}}/>} />
                  <Text style={styles.pillText}>TODAY'S PROGRESS</Text>
                </View>
                <Text style={styles.heroDate}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
              </View>
              <Text style={styles.heroValue}>{todayReps}</Text>
              <Text style={styles.heroLabel}>TOTAL REPS COMPLETED</Text>
              
              <View style={styles.heroStatsRow}>
                 <View>
                   <Text style={styles.heroStatLabel}>APPS UNLOCKED</Text>
                   <Text style={styles.heroStatValue}>{todayUnlocks}</Text>
                 </View>
                 <View>
                   <Text style={styles.heroStatLabel}>CALORIES (EST)</Text>
                   <Text style={styles.heroStatValue}>{todayCalories}</Text>
                 </View>
              </View>
            </View>
          </View>
        </View>

        {/* Wall of Fame (Leaderboard) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Real Activity Logs</Text>
          <SymbolView name="chart.pie.fill" size={24} tintColor="#FFD60A" fallback={<View style={{width: 24, height: 24}}/>} />
        </View>

        <View style={styles.leaderboardContainer}>
          {activityLogs.length === 0 ? (
            <BlurView intensity={20} style={styles.emptyCard} tint="dark">
              <SymbolView name="figure.run" size={32} tintColor="#8E8E93" style={{ marginBottom: 12 }} fallback={<View />} />
              <Text style={styles.emptyText}>No workouts logged today.</Text>
              <Text style={styles.emptySubtext}>Select apps in the Locker tab and unlock them with sweat.</Text>
            </BlurView>
          ) : (
            activityLogs.map((log) => {
              const formattedTime = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              let exerciseName = 'Push-ups';
              let tintColor = '#FF2D55';
              let iconName = 'camera.macro';
              
              if (log.exercise === 'squats') {
                exerciseName = 'Air Squats';
                tintColor = '#39FF14';
                iconName = 'play.rectangle.fill';
              } else if (log.exercise === 'pullups') {
                exerciseName = 'Pull-ups';
                tintColor = '#007AFF';
                iconName = 'bubble.left.and.bubble.right.fill';
              }

              return (
                <BlurView key={log.id} intensity={20} style={styles.appCard} tint="light">
                  <View style={[styles.appIconBg, { backgroundColor: `rgba(${tintColor === '#FF2D55' ? '255,45,85' : tintColor === '#39FF14' ? '57,255,20' : '0,122,255'},0.1)` }]}>
                    <SymbolView name={iconName as any} size={28} tintColor={tintColor} fallback={<View style={{width: 28, height: 28}}/>} />
                  </View>
                  <View style={styles.appInfo}>
                    <View style={styles.appTitleRow}>
                      <Text style={styles.appName}>{exerciseName}</Text>
                      <Text style={styles.timeText}>{formattedTime}</Text>
                    </View>
                    <View style={styles.tagsContainer}>
                      <View style={[styles.activityTag, { backgroundColor: `${tintColor}20` }]}>
                        <Text style={[styles.activityTagNumber, { color: tintColor }]}>{log.reps}</Text>
                        <Text style={[styles.activityTagLabel, { color: tintColor }]}>REPS COMPLETED</Text>
                      </View>
                    </View>
                  </View>
                </BlurView>
              );
            })
          )}
        </View>

        {/* Fun Facts */}
        <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Did You Know?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.factsScroll}>
          <View style={[styles.factCard, { backgroundColor: 'rgba(255,45,85,0.1)' }]}>
            <SymbolView name="flame.fill" size={32} tintColor="#FF2D55" style={{marginBottom: 12}} fallback={<View style={{width: 32, height: 32}}/>} />
            <Text style={styles.factText}>
              Your workout volume today has offset approximately {Math.max(1, Math.round(todayReps / 10))} hours of sedentary screen time.
            </Text>
          </View>

          <View style={[styles.factCard, { backgroundColor: 'rgba(57,255,20,0.1)' }]}>
            <SymbolView name="chart.bar.fill" size={32} tintColor="#39FF14" style={{marginBottom: 12}} fallback={<View style={{width: 32, height: 32}}/>} />
            <Text style={styles.factText}>
              You have burned an estimated {todayCalories} active calories unlocking apps today. Keep it up!
            </Text>
          </View>
          
          <View style={[styles.factCard, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
            <SymbolView name="globe.americas.fill" size={32} tintColor="#007AFF" style={{marginBottom: 12}} fallback={<View style={{width: 32, height: 32}}/>} />
            <Text style={styles.factText}>
              You are currently in the top 5% of active Motus users by consistency this week.
            </Text>
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
    marginBottom: 28,
  },
  greeting: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 2,
  },
  header: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroWrapper: {
    marginBottom: 40,
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  heroGradient: {
    borderRadius: 32,
    padding: 24,
    minHeight: 180,
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    overflow: 'hidden',
  },
  heroContent: {
    flex: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(57, 255, 20, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: {
    color: '#39FF14',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 1,
  },
  heroDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '700',
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
  heroStatsRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 32,
  },
  heroStatLabel: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  appTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activityTagNumber: {
    fontSize: 14,
    fontWeight: '900',
    marginRight: 4,
  },
  activityTagLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  factsScroll: {
    paddingRight: 24,
    paddingBottom: 20,
  },
  factCard: {
    width: width * 0.65,
    padding: 24,
    borderRadius: 32,
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  factText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 24,
  },
});
