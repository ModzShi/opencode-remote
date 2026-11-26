import { Platform } from 'react-native';

const light = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E5E8EE',
  primary: '#0A6CD6',
  primaryForeground: '#FFFFFF',
  primaryMuted: 'rgba(10,108,214,0.10)',
  secondary: '#EFF2F6',
  secondaryForeground: '#1D2939',
  muted: '#F0F2F5',
  mutedForeground: '#667085',
  accent: '#0A6CD6',
  accentForeground: '#FFFFFF',
  destructive: '#D92D20',
  destructiveForeground: '#FFFFFF',
  destructiveMuted: 'rgba(217,45,32,0.10)',
  success: '#12B76A',
  warning: '#F79009',
  foreground: '#101828',
  foregroundMuted: '#667085',
  input: '#FFFFFF',
  inputBorder: '#DDE1E8',
  ring: '#0A6CD6',
  terminalBackground: '#FFFFFF',
  terminalForeground: '#1D2939',
  tabBarBackground: '#FFFFFF',
  overlay: 'rgba(16,24,40,0.45)',
};

const dark: typeof light = {
  background: '#0B0D12',
  surface: '#12151C',
  surfaceElevated: '#171B24',
  card: '#12151C',
  border: '#232836',
  primary: '#6EA8FE',
  primaryForeground: '#08111F',
  primaryMuted: 'rgba(110,168,254,0.12)',
  secondary: '#1A1F29',
  secondaryForeground: '#E8EBF2',
  muted: '#1A1F29',
  mutedForeground: '#8B93A7',
  accent: '#6EA8FE',
  accentForeground: '#08111F',
  destructive: '#F97066',
  destructiveForeground: '#1A0505',
  destructiveMuted: 'rgba(249,112,102,0.12)',
  success: '#47CD89',
  warning: '#FDB022',
  foreground: '#EEF1F7',
  foregroundMuted: '#8B93A7',
  input: '#171B24',
  inputBorder: '#2A3040',
  ring: '#6EA8FE',
  terminalBackground: '#0B0D12',
  terminalForeground: '#D7DEEA',
  tabBarBackground: '#0E1118',
  overlay: 'rgba(0,0,0,0.6)',
};

export type ThemeColors = typeof light;

export const palettes: Record<'light' | 'dark', ThemeColors> = { light, dark };

export const fonts = {
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};
