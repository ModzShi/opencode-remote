import { useColorScheme } from 'react-native';
import { useAppStore } from '@/store';
import { palettes, ThemeColors } from '@/theme';

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const themeSetting = useAppStore((state) => state.settings.theme);

  const colorScheme =
    themeSetting === 'system' ? systemColorScheme ?? 'dark' : themeSetting;

  const colors: ThemeColors = palettes[colorScheme];

  return {
    colorScheme,
    colors,
    isDark: colorScheme === 'dark',
  };
}
