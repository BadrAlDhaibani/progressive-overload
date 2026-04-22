import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AVATAR_PALETTE, useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function avatarColorFor(seed: string, color?: string | null): string {
  return color ?? AVATAR_PALETTE[hashCode(seed) % AVATAR_PALETTE.length];
}

// Pick white or near-black for the initial based on the background's perceived
// luminance, so lighter palette entries (amber, fuchsia) stay legible.
function foregroundFor(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1f2937' : '#ffffff';
}

interface Props {
  seed: string;
  label?: string | null;
  size?: number;
  color?: string | null;
}

export default function Avatar({ seed, label, size = 40, color }: Props) {
  const colors = useColors();
  const background = avatarColorFor(seed, color);
  const foreground = foregroundFor(background);
  const styles = useMemo(
    () => createStyles(colors, size, foreground),
    [colors, size, foreground]
  );

  const initial = (label ?? seed)
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 1)
    .toUpperCase() || '?';

  return (
    <View style={[styles.avatar, { backgroundColor: background }]}>
      <Text style={styles.initial}>{initial}</Text>
    </View>
  );
}

const createStyles = (colors: Colors, size: number, foreground: string) =>
  StyleSheet.create({
    avatar: {
      width: size,
      height: size,
      borderRadius: size / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initial: {
      color: foreground,
      fontFamily: fonts.semiBold,
      fontSize: size * 0.42,
    },
  });
