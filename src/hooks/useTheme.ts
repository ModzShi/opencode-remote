import { useColorScheme } from 'react-native';
import { useAppStore } from '@/store';
import { palettes, ThemeColors } from '@/theme';
import { withAccent } from '@/theme/accents';

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const themeSetting = useAppStore((state) => state.settings.theme);

  const colorScheme =
    themeSetting === 'system' ? systemColorScheme ?? 'dark' : themeSetting;

  const accentPreset = useAppStore((state) => state.settings.accentPreset);
  const colors: ThemeColors = withAccent(palettes[colorScheme], colorScheme, accentPreset);

  return {
    colorScheme,
    colors,
    isDark: colorScheme === 'dark',
  };
}
