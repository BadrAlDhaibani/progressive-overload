import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const SPARKLES = [
  { x: 0.28, y: 0.2,  d: 0,    r: 5 },
  { x: 0.5,  y: 0.28, d: 700,  r: 7 },
  { x: 0.74, y: 0.22, d: 1200, r: 5 },
  { x: 0.18, y: 0.42, d: 400,  r: 6 },
  { x: 0.42, y: 0.56, d: 900,  r: 5 },
  { x: 0.62, y: 0.5,  d: 300,  r: 7 },
  { x: 0.82, y: 0.52, d: 1600, r: 4 },
  { x: 0.35, y: 0.74, d: 1100, r: 5 },
  { x: 0.6,  y: 0.78, d: 500,  r: 4 },
];

interface Props {
  size?: number;
}

export default function CheeseSlice({ size = 260 }: Props) {
  const bob = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(
      withTiming(1, { duration: 3800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [bob]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(bob.value, [0, 1], [-5, 5]) },
      { rotate: `${interpolate(bob.value, [0, 1], [-1.5, 1.5])}deg` },
    ],
  }));

  const width = size;
  const height = Math.round(size * 0.82);

  return (
    <Animated.View style={[styles.wrap, { width, height }, floatStyle]}>
      <Image
        source={require('@/assets/images/cheese-gem.png')}
        resizeMode="contain"
        style={{ width, height }}
      />
      <View style={[styles.overlay, { width, height }]} pointerEvents="none">
        {SPARKLES.map((s, i) => (
          <Sparkle key={i} width={width} height={height} x={s.x} y={s.y} delay={s.d} maxR={s.r} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});

interface SparkleProps {
  width: number;
  height: number;
  x: number;
  y: number;
  delay: number;
  maxR: number;
}

function Sparkle({ width, height, x, y, delay, maxR }: SparkleProps) {
  const twinkle = useSharedValue(0);
  const px = Math.round(width * x);
  const py = Math.round(height * y);

  useEffect(() => {
    twinkle.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      )
    );
  }, [twinkle, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(twinkle.value, [0, 0.5, 1], [0, 1, 0]),
    transform: [
      { scale: interpolate(twinkle.value, [0, 0.5, 1], [0.3, 1, 0.3]) },
      { rotate: `${interpolate(twinkle.value, [0, 1], [0, 90])}deg` },
    ],
  }));

  const svgSize = maxR * 4;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: px - svgSize / 2,
          top: py - svgSize / 2,
          width: svgSize,
          height: svgSize,
        },
        style,
      ]}
    >
      <Svg
        width={svgSize}
        height={svgSize}
        viewBox={`-${maxR * 2} -${maxR * 2} ${svgSize} ${svgSize}`}
      >
        <Path
          d={`M 0 ${-maxR} L ${maxR * 0.3} ${-maxR * 0.3} L ${maxR} 0 L ${maxR * 0.3} ${maxR * 0.3} L 0 ${maxR} L ${-maxR * 0.3} ${maxR * 0.3} L ${-maxR} 0 L ${-maxR * 0.3} ${-maxR * 0.3} Z`}
          fill="#ffffff"
        />
      </Svg>
    </Animated.View>
  );
}
