import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { MessageSquare, Settings, Wifi } from 'lucide-react-native';

export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(9,9,11,0.92)' : colors.tabBarBackground,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 54 + insets.bottom,
          paddingTop: 7,
          paddingBottom: Math.max(insets.bottom, 6),
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 1,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
        },
      }}
    >
      <Tabs.Screen
        name="terminal"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused, color }) => (
            <MessageSquare size={21} color={color} strokeWidth={focused ? 2.4 : 1.9} />
          ),
        }}
      />
      <Tabs.Screen
        name="pairing"
        options={{
          title: 'Parear',
          tabBarIcon: ({ focused, color }) => (
            <Wifi size={21} color={color} strokeWidth={focused ? 2.4 : 1.9} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ focused, color }) => (
            <Settings size={21} color={color} strokeWidth={focused ? 2.4 : 1.9} />
          ),
        }}
      />
    </Tabs>
  );
}
