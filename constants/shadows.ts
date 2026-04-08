import { Platform, ViewStyle } from 'react-native';
import { Colors } from './colors';

export function cardShadow(colors: Colors): ViewStyle {
  // In dark mode, shadows are invisible against dark backgrounds.
  // Cards rely on bgCard/bg contrast instead.
  if (colors.isDark) return {};

  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
    },
    android: { elevation: 4 },
    default: {},
  })!;
}
