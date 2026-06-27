import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DashboardScreen from './index';
import AppsScreen from './apps';
import SettingsScreen from './settings';

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  
  // Resolve active tab index from pathname
  let activeTab = 0;
  if (pathname === '/settings' || pathname.includes('settings')) {
    activeTab = 2;
  } else if (pathname === '/apps' || pathname.includes('apps')) {
    activeTab = 1;
  }

  const handleTabPress = (index: number) => {
    const routes = ['/', '/apps', '/settings'];
    router.replace(routes[index] as any);
  };

  const barHeight = 64 + (insets.bottom > 0 ? insets.bottom : 16);

  return (
    <View style={styles.container}>
      <View style={styles.tabContentContainer}>
        <View style={[styles.tabScreen, activeTab === 0 ? styles.activeScreen : styles.inactiveScreen, { bottom: barHeight }]}>
          <DashboardScreen />
        </View>
        <View style={[styles.tabScreen, activeTab === 1 ? styles.activeScreen : styles.inactiveScreen, { bottom: barHeight }]}>
          <AppsScreen />
        </View>
        <View style={[styles.tabScreen, activeTab === 2 ? styles.activeScreen : styles.inactiveScreen, { bottom: barHeight }]}>
          <SettingsScreen />
        </View>
      </View>

      {/* Custom Bottom Tab Bar */}
      <View style={[styles.tabBarContainer, { height: barHeight, zIndex: 10 }]}>
        <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={[styles.tabBar, { paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 8 }]}>
          <TouchableOpacity 
            style={styles.tabButton} 
            activeOpacity={0.8} 
            onPress={() => handleTabPress(0)}
          >
            <SymbolView 
              name="chart.bar.fill" 
              size={24} 
              tintColor={activeTab === 0 ? '#39FF14' : '#8E8E93'} 
              fallback={<View style={[styles.fallbackIcon, { backgroundColor: activeTab === 0 ? '#39FF14' : '#8E8E93' }]} />}
            />
            <Text style={[styles.tabLabel, { color: activeTab === 0 ? '#39FF14' : '#8E8E93' }]}>
              Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabButton} 
            activeOpacity={0.8} 
            onPress={() => handleTabPress(1)}
          >
            <SymbolView 
              name="lock.fill" 
              size={24} 
              tintColor={activeTab === 1 ? '#39FF14' : '#8E8E93'} 
              fallback={<View style={[styles.fallbackIcon, { backgroundColor: activeTab === 1 ? '#39FF14' : '#8E8E93' }]} />}
            />
            <Text style={[styles.tabLabel, { color: activeTab === 1 ? '#39FF14' : '#8E8E93' }]}>
              Locker
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabButton} 
            activeOpacity={0.8} 
            onPress={() => handleTabPress(2)}
          >
            <SymbolView 
              name="gearshape.fill" 
              size={24} 
              tintColor={activeTab === 2 ? '#39FF14' : '#8E8E93'} 
              fallback={<View style={[styles.fallbackIcon, { backgroundColor: activeTab === 2 ? '#39FF14' : '#8E8E93' }]} />}
            />
            <Text style={[styles.tabLabel, { color: activeTab === 2 ? '#39FF14' : '#8E8E93' }]}>
              Settings
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  tabContentContainer: {
    flex: 1,
  },
  tabScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  activeScreen: {
    opacity: 1,
    zIndex: 1,
  },
  inactiveScreen: {
    opacity: 0,
    zIndex: 0,
    pointerEvents: 'none',
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0,
    overflow: 'hidden',
  },
  tabBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  fallbackIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
});
