import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { useMotusStore, EXERCISE_MULTIPLIERS } from '../../store/useStore';
import Svg, { Line } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { 
    todayReps, 
    todayCalories, 
    todayUnlocks, 
    activityLogs, 
    weeklyCalories,
    fetchStatsAndActivity, 
    token, 
    user 
  } = useMotusStore();

  useEffect(() => {
    if (token) {
      fetchStatsAndActivity();
    }
  }, [token]);

  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).toUpperCase();

  const chartScrollRef = useRef<ScrollView>(null);
  const [activeWeekIndex, setActiveWeekIndex] = useState(2);
  const paneWidth = width - 96;

  const getWeekRangeLabel = (weekDays: { date: string }[]) => {
    if (!weekDays || weekDays.length === 0) return '';
    const firstDate = new Date(weekDays[0].date);
    const lastDate = new Date(weekDays[6].date);
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${firstDate.toLocaleDateString('en-US', options)} - ${lastDate.toLocaleDateString('en-US', options)}`;
  };

  const handleChartScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / paneWidth);
    if (index >= 0 && index <= 2) {
      setActiveWeekIndex(index);
    }
  };

  const getPrePopulatedWeekly = (): { date: string; dayLabel: string; calories: number }[][] => {
    if (weeklyCalories && weeklyCalories.length === 3) return weeklyCalories;
    
    // Generate fallback for 3 weeks starting from Monday
    const currentMonday = new Date();
    const day = currentMonday.getDay();
    const diff = day === 0 ? 6 : day - 1;
    currentMonday.setDate(currentMonday.getDate() - diff);
    currentMonday.setHours(0, 0, 0, 0);

    const weeks = [];
    for (let w = 2; w >= 0; w--) {
      const weekMonday = new Date(currentMonday);
      weekMonday.setDate(currentMonday.getDate() - (w * 7));
      
      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekMonday);
        d.setDate(weekMonday.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
        weekDays.push({
          date: dateStr,
          dayLabel: dayLabel,
          calories: 0,
        });
      }
      weeks.push(weekDays);
    }
    return weeks;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      chartScrollRef.current?.scrollTo({ x: paneWidth * 2, animated: false });
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const currentWeeklyData = getPrePopulatedWeekly();

  return (
    <View style={styles.container}>
      {/* Background Ambient Glows */}
      <View style={styles.ambientGlowGreen} />
      <View style={styles.ambientGlowBlue} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.dateText}>{todayDateStr}</Text>
          <Text style={styles.header}>{user ? `Hey, ${user.name}` : 'Welcome back'}</Text>
        </View>

        {/* Hero Card */}
        <View style={styles.heroWrapper}>
          <BlurView intensity={30} style={styles.heroCard} tint="dark">
            <View style={styles.heroHeader}>
              <View style={styles.metricsBadge}>
                <SymbolView name="sparkles" size={12} tintColor="#39FF14" />
                <Text style={styles.metricsBadgeText}>DAILY OVERVIEW</Text>
              </View>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>

            <View style={styles.mainStatContainer}>
              <Text style={styles.mainStatValue}>{todayReps}</Text>
              <Text style={styles.mainStatLabel}>REPS COMPLETED TODAY</Text>
            </View>

            <View style={styles.statsDivider} />

            <View style={styles.statsGrid}>
              <View style={styles.statColumn}>
                <View style={styles.statIconRow}>
                  <SymbolView name="flame.fill" size={12} tintColor="#FF3B30" />
                  <Text style={styles.statLabel}>BURNED</Text>
                </View>
                <Text style={styles.statValue}>{todayCalories} <Text style={styles.statUnit}>kcal</Text></Text>
              </View>

              <View style={styles.statColumn}>
                <View style={styles.statIconRow}>
                  <SymbolView name="lock.open.fill" size={12} tintColor="#39FF14" />
                  <Text style={styles.statLabel}>UNLOCKED</Text>
                </View>
                <Text style={styles.statValue}>{todayUnlocks} <Text style={styles.statUnit}>apps</Text></Text>
              </View>

              <View style={styles.statColumn}>
                <View style={styles.statIconRow}>
                  <SymbolView name="clock.fill" size={12} tintColor="#007AFF" />
                  <Text style={styles.statLabel}>EARNED</Text>
                </View>
                <Text style={styles.statValue}>{todayReps * 2} <Text style={styles.statUnit}>min</Text></Text>
              </View>
            </View>
          </BlurView>
        </View>

        {/* Weekly Bar Chart */}
        <View style={styles.chartWrapper}>
          <BlurView intensity={30} style={styles.chartCard} tint="dark">
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>WEEKLY CALORIC BURN</Text>
                <Text style={styles.chartSubtitle}>
                  {currentWeeklyData[activeWeekIndex] ? getWeekRangeLabel(currentWeeklyData[activeWeekIndex]) : 'Calories burned by unlocking apps'}
                </Text>
              </View>
            </View>

            <ScrollView
              ref={chartScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleChartScroll}
              style={{ width: paneWidth }}
              contentContainerStyle={{ alignItems: 'flex-end' }}
              decelerationRate="fast"
              snapToInterval={paneWidth}
              snapToAlignment="center"
              bounces={true}
              nestedScrollEnabled={true}
              directionalLockEnabled={true}
            >
              {currentWeeklyData.map((week, wIdx) => {
                const maxCalories = Math.max(...week.map(d => d.calories), 10);
                const weekTotal = week.reduce((sum, d) => sum + d.calories, 0);
                const weekAverage = weekTotal / 7;
                
                return (
                  <View key={wIdx} style={{ width: paneWidth, height: 140 }}>
                    {/* Dotted Average Line */}
                    {weekAverage > 0 && (() => {
                      const colWidth = paneWidth / 7;
                      const lineLeft = colWidth / 2;
                      const lineWidth = paneWidth - colWidth;
                      const lineY = 21 + (weekAverage / maxCalories) * 100;
                      
                      return (
                        <View style={{ position: 'absolute', left: 0, right: 0, bottom: lineY, height: 1, zIndex: 2 }} pointerEvents="none">
                          <View style={{ left: lineLeft, width: lineWidth, height: 1 }}>
                            <Svg height="1" width={lineWidth}>
                              <Line 
                                x1="0" 
                                y1="0" 
                                x2={lineWidth} 
                                y2="0" 
                                stroke="rgba(255, 255, 255, 0.3)" 
                                strokeWidth="1.2" 
                                strokeDasharray="3, 3" 
                              />
                            </Svg>
                          </View>
                          <Text style={styles.averageLineLabel}>avg: {Math.round(weekAverage)}</Text>
                        </View>
                      );
                    })()}

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: '100%', width: '100%' }}>
                      {week.map((item) => {
                        const percentHeight = Math.max(8, (item.calories / maxCalories) * 100);
                        const isToday = item.date === new Date().toISOString().split('T')[0];
                        const isBelowAverage = item.calories < weekAverage;

                        let barColor = 'rgba(57, 255, 20, 0.5)';
                        if (isBelowAverage) {
                          barColor = isToday ? '#FF9500' : 'rgba(255, 149, 0, 0.5)';
                        } else {
                          barColor = isToday ? '#39FF14' : 'rgba(57, 255, 20, 0.5)';
                        }

                        return (
                          <View key={item.date} style={styles.barColumn}>
                            <Text style={[
                              styles.barCaloriesLabel, 
                              isToday && styles.activeBarCaloriesLabel,
                              isToday && isBelowAverage && styles.activeBarCaloriesLabelAmber
                            ]}>
                              {item.calories}
                            </Text>
                            <View style={styles.barTrack}>
                              <View 
                                style={[
                                  styles.barFill, 
                                  { 
                                    height: `${percentHeight}%`,
                                    backgroundColor: barColor
                                  },
                                  isToday && {
                                    shadowColor: isBelowAverage ? '#FF9500' : '#39FF14',
                                    shadowOffset: { width: 0, height: 0 },
                                    shadowOpacity: 0.6,
                                    shadowRadius: 8,
                                  }
                                ]} 
                              />
                            </View>
                            <Text style={[
                              styles.barDayLabel, 
                              isToday && styles.activeBarDayLabel,
                              isToday && isBelowAverage && styles.activeBarDayLabelAmber
                            ]}>
                              {item.dayLabel}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Page Indicators */}
            <View style={styles.pageIndicatorContainer}>
              {[0, 1, 2].map((i) => (
                <View 
                  key={i} 
                  style={[
                    styles.pageIndicatorDot, 
                    i === activeWeekIndex && styles.activePageIndicatorDot
                  ]} 
                />
              ))}
            </View>
          </BlurView>
        </View>

        {/* Activity Timeline Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Workout Feed</Text>
            <Text style={styles.sectionSubtitle}>Your timeline of effort today</Text>
          </View>
          <SymbolView name="figure.run" size={20} tintColor="#39FF14" />
        </View>

        <View style={styles.timelineContainer}>
          {activityLogs.length === 0 ? (
            <BlurView intensity={10} style={styles.emptyCard} tint="dark">
              <SymbolView name="figure.highintensity.intervaltraining" size={32} tintColor="#8E8E93" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>No activity logged yet</Text>
              <Text style={styles.emptySubtext}>Your unlocked app sessions will appear here as you sweat.</Text>
            </BlurView>
          ) : (
            activityLogs.map((log, index) => {
              const formattedTime = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              let exerciseName = 'Push-ups';
              let tintColor = '#FF2D55';
              let iconName = 'figure.strengthtraining.traditional';
              
              if (log.exercise === 'squats') {
                exerciseName = 'Air Squats';
                tintColor = '#39FF14';
                iconName = 'figure.cooldown';
              } else if (log.exercise === 'pullups') {
                exerciseName = 'Pull-ups';
                tintColor = '#007AFF';
                iconName = 'figure.mixed.cardio';
              } else if (log.exercise === 'jumping_jacks') {
                exerciseName = 'Jumping Jacks';
                tintColor = '#FF9500';
                iconName = 'figure.highintensity.intervaltraining';
              } else if (log.exercise === 'burpees') {
                exerciseName = 'Burpees';
                tintColor = '#AF52DE';
                iconName = 'figure.cross.training';
              } else if (log.exercise === 'high_knees') {
                exerciseName = 'High Knees';
                tintColor = '#FFCC00';
                iconName = 'figure.run';
              }

              const isLast = index === activityLogs.length - 1;
              const multiplier = EXERCISE_MULTIPLIERS[log.exercise] || 1;
              const minutes = log.minutes || (log.reps * multiplier);
              
              // Calorie coefficient matching backend values
              const calorieCoef = log.exercise === 'pushups' ? 1.2 : log.exercise === 'pullups' ? 2.0 : log.exercise === 'squats' ? 0.5 : log.exercise === 'jumping_jacks' ? 0.8 : log.exercise === 'burpees' ? 2.5 : log.exercise === 'high_knees' ? 1.0 : 1.0;
              const calories = log.calories || Math.round(log.reps * calorieCoef);

              const isFirst = index === 0;

              return (
                <View key={log.id} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    {/* Timeline Line */}
                    {!isLast && (
                      <View style={[
                        styles.timelineLine,
                        isFirst && { top: '50%' }
                      ]} />
                    )}
                    {isLast && !isFirst && (
                      <View style={[
                        styles.timelineLine,
                        { bottom: '50%' }
                      ]} />
                    )}

                    {/* Timeline Node */}
                    <View style={[styles.timelineNode, { borderColor: tintColor, backgroundColor: '#000000' }]}>
                      <SymbolView name={iconName as any} size={14} tintColor={tintColor} />
                    </View>
                  </View>
                  
                  <BlurView intensity={10} style={styles.timelineCard} tint="dark">
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.timelineExerciseName}>{exerciseName}</Text>
                        <Text style={styles.timelineDetail}>
                          {log.unlockedApp ? 'Application Unlock' : 'Training Mode'}
                        </Text>
                      </View>
                      <Text style={styles.timelineTime}>{formattedTime}</Text>
                    </View>
                    <View style={styles.timelineTagRow}>
                      <View style={[styles.inlineTag, { backgroundColor: `${tintColor}15` }]}>
                        <Text style={[styles.inlineTagText, { color: tintColor }]}>{log.reps} Reps</Text>
                      </View>
                      <Text style={styles.caloriesBurnedText}>+{calories} kcal</Text>
                    </View>
                  </BlurView>
                </View>
              );
            })
          )}
        </View>

        {/* Dynamic Insights */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Daily Insights</Text>
            <Text style={styles.sectionSubtitle}>Smart health metrics analysis</Text>
          </View>
          <SymbolView name="sparkles" size={20} tintColor="#FFD60A" />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.factsScroll}>
          <BlurView intensity={15} style={styles.insightCard} tint="dark">
            <View style={[styles.insightIconContainer, { backgroundColor: 'rgba(255,45,85,0.1)' }]}>
              <SymbolView name="flame.fill" size={22} tintColor="#FF2D55" />
            </View>
            <Text style={styles.insightTitle}>Sedentary Offset</Text>
            <Text style={styles.insightText}>
              Your workout volume today has offset approximately {Math.max(1, Math.round(todayReps / 10))} hours of sitting screen time.
            </Text>
          </BlurView>

          <BlurView intensity={15} style={styles.insightCard} tint="dark">
            <View style={[styles.insightIconContainer, { backgroundColor: 'rgba(57,255,20,0.1)' }]}>
              <SymbolView name="sparkles" size={22} tintColor="#39FF14" />
            </View>
            <Text style={styles.insightTitle}>Caloric Efficiency</Text>
            <Text style={styles.insightText}>
              You have burned an estimated {todayCalories} active calories unlocking apps today. Keep it up!
            </Text>
          </BlurView>
          
          <BlurView intensity={15} style={styles.insightCard} tint="dark">
            <View style={[styles.insightIconContainer, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
              <SymbolView name="globe.americas.fill" size={22} tintColor="#007AFF" />
            </View>
            <Text style={styles.insightTitle}>Global Ranking</Text>
            <Text style={styles.insightText}>
              You are currently in the top 5% of active Motus users by consistency this week.
            </Text>
          </BlurView>
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
  ambientGlowGreen: {
    position: 'absolute',
    top: 50,
    left: -120,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#39FF14',
    opacity: 0.08,
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
  },
  content: {
    padding: 24,
    paddingTop: 80,
    paddingBottom: 140,
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
  heroWrapper: {
    marginBottom: 40,
    borderRadius: 32,
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  heroCard: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(57, 255, 20, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 20, 0.15)',
  },
  metricsBadgeText: {
    color: '#39FF14',
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 5,
    letterSpacing: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#39FF14',
    marginRight: 6,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mainStatContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  mainStatValue: {
    fontSize: 90,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -3,
    lineHeight: 90,
  },
  mainStatLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginTop: 8,
  },
  statsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  statUnit: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '850',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    marginTop: 2,
  },
  timelineContainer: {
    marginBottom: 40,
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    width: 32,
    position: 'relative',
  },
  timelineNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  timelineLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  timelineCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineExerciseName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  timelineDetail: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    marginTop: 2,
  },
  timelineTime: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  timelineTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inlineTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inlineTagText: {
    fontSize: 12,
    fontWeight: '900',
  },
  caloriesBurnedText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '700',
  },
  emptyCard: {
    padding: 36,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  emptySubtext: {
    color: '#8E8E93',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  factsScroll: {
    paddingRight: 24,
    paddingBottom: 20,
  },
  insightCard: {
    width: width * 0.7,
    padding: 20,
    borderRadius: 24,
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  insightIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 13,
    color: '#A1A1AA',
    lineHeight: 20,
    fontWeight: '500',
  },
  chartWrapper: {
    marginBottom: 40,
    borderRadius: 32,
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 8,
  },
  chartCard: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  chartSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 4,
  },
  totalBurnBadge: {
    backgroundColor: 'rgba(57, 255, 20, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 20, 0.2)',
  },
  totalBurnText: {
    color: '#39FF14',
    fontSize: 13,
    fontWeight: '900',
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 10,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 100,
    width: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  activeBarFill: {
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  barDayLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '750',
    marginTop: 10,
  },
  activeBarDayLabel: {
    color: '#39FF14',
    fontWeight: '900',
  },
  barCaloriesLabel: {
    fontSize: 9,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 6,
  },
  activeBarCaloriesLabel: {
    color: '#39FF14',
    fontWeight: '800',
  },
  pageIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  pageIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 4,
  },
  activePageIndicatorDot: {
    backgroundColor: '#39FF14',
  },
  activeBarCaloriesLabelAmber: {
    color: '#FF9500',
    fontWeight: '800',
  },
  activeBarDayLabelAmber: {
    color: '#FF9500',
    fontWeight: '900',
  },
  averageLineLabel: {
    position: 'absolute',
    right: 4,
    top: -7,
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
});
