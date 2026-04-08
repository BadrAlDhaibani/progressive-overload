import React from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ViewStyle, StyleProp } from 'react-native';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function AnimatedScreen({ children, style }: Props) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={[{ flex: 1 }, style]}>
      {children}
    </Animated.View>
  );
}
