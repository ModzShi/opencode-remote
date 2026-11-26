import { useColorScheme } from 'react-native';
import { useAppStore } from '@/store';

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const { settings } = useAppStore();

  const colorScheme = settings.theme === 'system' ? systemColorScheme : settings.theme;

  const colors = {
    light: {
      background: '#fafafa',
      surface: '#ffffff',
      surfaceElevated: '#ffffff',
      border: '#e5e5e5',
      primary: '#0066cc',
      primaryForeground: '#ffffff',
      secondary: '#f5f5f5',
      secondaryForeground: '#171717',
      muted: '#f5f5f5',
      mutedForeground: '#737373',
      accent: '#0066cc',
      accentForeground: '#ffffff',
      destructive: '#dc2626',
      destructiveForeground: '#ffffff',
      success: '#16a34a',
      warning: '#ea580c',
      foreground: '#171717',
      foregroundMuted: '#737373',
      card: '#ffffff',
      cardForeground: '#171717',
      popover: '#ffffff',
      popoverForeground: '#171717',
      input: '#ffffff',
      inputBorder: '#e5e5e5',
      ring: '#0066cc',
      terminalBackground: '#fafafa',
      terminalForeground: '#171717',
      sidebarBackground: '#ffffff',
      headerBackground: '#ffffff',
      tabBarBackground: '#ffffff',
    },
    dark: {
      background: '#0a0a0f',
      surface: '#111118',
      surfaceElevated: '#1a1a24',
      border: '#2a2a3a',
      primary: '#4da6ff',
      primaryForeground: '#000000',
      secondary: '#1a1a24',
      secondaryForeground: '#fafafa',
      muted: '#1a1a24',
      mutedForeground: '#888899',
      accent: '#4da6ff',
      accentForeground: '#000000',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
      success: '#22c55e',
      warning: '#f97316',
      foreground: '#fafafa',
      foregroundMuted: '#888899',
      card: '#111118',
      cardForeground: '#fafafa',
      popover: '#1a1a24',
      popoverForeground: '#fafafa',
      input: '#1a1a24',
      inputBorder: '#2a2a3a',
      ring: '#4da6ff',
      terminalBackground: '#0a0a0f',
      terminalForeground: '#e0e0e0',
      sidebarBackground: '#111118',
      headerBackground: '#111118',
      tabBarBackground: '#111118',
    },
  };

  const theme = colors[colorScheme || 'dark'];

  return {
    colorScheme: colorScheme || 'dark',
    colors: theme,
    isDark: colorScheme === 'dark',
  };
}