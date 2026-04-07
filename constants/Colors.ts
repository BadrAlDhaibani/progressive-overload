import { useColorScheme } from 'react-native';

const lightColors = {
  // Backgrounds
  bg: '#ffffff',
  bgCard: '#f9fafb',
  bgMuted: '#f3f4f6',

  // Rose accent (primary)
  primary: '#f43f5e',
  primaryLight: '#ffe4e6',
  primaryMedium: '#fb7185',
  primaryDark: '#e11d48',

  // Text
  text: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',

  // Borders & dividers
  border: '#e5e7eb',
  divider: '#f3f4f6',

  // Semantic
  success: '#22c55e',
  error: '#ef4444',

  // Contrast text on primary bg
  textOnPrimary: '#ffffff',
} as const;

export type Colors = typeof lightColors;

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
};

export function useColors(): Colors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}
