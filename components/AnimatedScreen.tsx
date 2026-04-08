import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useColors } from '@/constants/colors';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function AnimatedScreen({ children, style }: Props) {
  const colors = useColors();

  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg }, style]}>
      <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
        {children}
      </Animated.View>
    </View>
  );
}
