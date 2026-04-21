import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

const PALETTE = [
  ['#fb7185', '#f43f5e'],
  ['#60a5fa', '#2563eb'],
  ['#f59e0b', '#d97706'],
  ['#34d399', '#059669'],
  ['#a78bfa', '#7c3aed'],
  ['#22d3ee', '#0891b2'],
  ['#f472b6', '#be185d'],
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface Props {
  seed: string;
  label?: string | null;
  size?: number;
}

export default function Avatar({ seed, label, size = 40 }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors, size), [colors, size]);
  const idx = hashCode(seed) % PALETTE.length;
  const [start] = PALETTE[idx];

  const initial = (label ?? seed)
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 1)
    .toUpperCase() || '?';

  return (
    <View style={[styles.avatar, { backgroundColor: start }]}>
      <Text style={styles.initial}>{initial}</Text>
    </View>
  );
}

const createStyles = (colors: Colors, size: number) =>
  StyleSheet.create({
    avatar: {
      width: size,
      height: size,
      borderRadius: size / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initial: {
      color: '#ffffff',
      fontFamily: fonts.semiBold,
      fontSize: size * 0.42,
    },
  });
