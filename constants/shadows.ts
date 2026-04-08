import { Platform, ViewStyle } from 'react-native';

export const cardShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  android: {
    elevation: 4,
  },
  default: {},
})!;
