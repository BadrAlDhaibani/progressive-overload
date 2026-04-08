import { useCallback } from 'react';
import {
  Pressable,
  type PressableProps,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

interface AnimatedPressableProps extends PressableProps {
  containerStyle?: StyleProp<ViewStyle>;
}

export default function AnimatedPressable({
  onPressIn,
  onPressOut,
  containerStyle,
  ...props
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      scale.value = withTiming(0.97, { duration: 100 });
      onPressIn?.(e);
    },
    [onPressIn, scale]
  );

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      scale.value = withTiming(1, { duration: 150 });
      onPressOut?.(e);
    },
    [onPressOut, scale]
  );

  return (
    <Animated.View style={[animatedStyle, containerStyle]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...props}
      />
    </Animated.View>
  );
}
