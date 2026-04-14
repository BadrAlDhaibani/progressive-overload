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
  scaleValue?: number;
  pressDuration?: number;
}

export default function AnimatedPressable({
  onPressIn,
  onPressOut,
  containerStyle,
  scaleValue = 0.97,
  pressDuration = 100,
  ...props
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      scale.value = withTiming(scaleValue, { duration: pressDuration });
      onPressIn?.(e);
    },
    [onPressIn, scale, scaleValue, pressDuration]
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
