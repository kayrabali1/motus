import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#39FF14',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarBackground: () => (
          <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <SymbolView name="chart.bar.fill" size={24} tintColor={color} fallback={<View style={{ width: 24, height: 24, backgroundColor: color, borderRadius: 4 }}/>} />
          ),
        }}
      />
      <Tabs.Screen
        name="apps"
        options={{
          title: 'Locker',
          tabBarIcon: ({ color }) => (
            <SymbolView name="lock.fill" size={24} tintColor={color} fallback={<View style={{ width: 24, height: 24, backgroundColor: color, borderRadius: 12 }}/>} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <SymbolView name="gearshape.fill" size={24} tintColor={color} fallback={<View style={{ width: 24, height: 24, backgroundColor: color, borderRadius: 12 }}/>} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: 'transparent',
    height: 90,
  },
});
