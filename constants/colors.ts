import { useColorScheme } from 'react-native';

export type Colors = {
  bg: string;
  bgCard: string;
  bgMuted: string;
  primary: string;
  primaryLight: string;
  primaryMedium: string;
  primaryDark: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
  success: string;
  error: string;
  textOnPrimary: string;
  isDark: boolean;
};

const lightColors: Colors = {
  bg: '#ffffff',
  bgCard: '#f9fafb',
  bgMuted: '#f3f4f6',

  primary: '#f43f5e',
  primaryLight: '#ffe4e6',
  primaryMedium: '#fb7185',
  primaryDark: '#e11d48',

  text: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',

  border: '#e5e7eb',
  divider: '#f3f4f6',

  success: '#22c55e',
  error: '#ef4444',

  textOnPrimary: '#ffffff',

  isDark: false,
};

const darkColors: Colors = {
  bg: '#121212',
  bgCard: '#1e1e1e',
  bgMuted: '#2a2a2a',

  primary: '#f43f5e',
  primaryLight: '#3d1520',
  primaryMedium: '#fb7185',
  primaryDark: '#ff6b81',

  text: '#f1f1f1',
  textSecondary: '#a1a1a1',
  textMuted: '#6b6b6b',

  border: '#2e2e2e',
  divider: '#2a2a2a',

  success: '#22c55e',
  error: '#ef4444',

  textOnPrimary: '#ffffff',

  isDark: true,
};

export function useColors(): Colors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}

export const AVATAR_PALETTE = [
  '#fb7185',
  '#60a5fa',
  '#f59e0b',
  '#34d399',
  '#a78bfa',
  '#22d3ee',
  '#f472b6',
];
