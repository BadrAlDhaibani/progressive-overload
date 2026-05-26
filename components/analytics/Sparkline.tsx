import { memo } from 'react';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

interface Props {
  points: number[];
  color: string;
  width?: number;
  height?: number;
}

const STROKE = 1.5;
const ENDPOINT_R = 2.25;

function Sparkline({ points, color, width = 80, height = 24 }: Props) {
  if (points.length === 0) return null;

  const padX = ENDPOINT_R + STROKE / 2;
  const padY = ENDPOINT_R + STROKE / 2;
  const innerW = Math.max(0, width - padX * 2);
  const innerH = Math.max(0, height - padY * 2);
  const midY = padY + innerH / 2;

  if (points.length === 1) {
    return (
      <Svg width={width} height={height}>
        <Circle cx={width / 2} cy={midY} r={ENDPOINT_R} fill={color} />
      </Svg>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min;
  const stepX = innerW / (points.length - 1);

  if (range === 0) {
    return (
      <Svg width={width} height={height}>
        <Line
          x1={padX}
          y1={midY}
          x2={padX + innerW}
          y2={midY}
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        <Circle cx={padX + innerW} cy={midY} r={ENDPOINT_R} fill={color} />
      </Svg>
    );
  }

  const coords = points.map((p, i) => {
    const x = padX + i * stepX;
    const y = padY + (1 - (p - min) / range) * innerH;
    return `${x},${y}`;
  });
  const last = coords[coords.length - 1].split(',');

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={coords.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={Number(last[0])} cy={Number(last[1])} r={ENDPOINT_R} fill={color} />
    </Svg>
  );
}

export default memo(Sparkline);
