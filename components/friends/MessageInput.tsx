import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import AnimatedPressable from '@/components/AnimatedPressable';

interface Props {
  onSend: (body: string) => Promise<void>;
}

export default function MessageInput({ onSend }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);

  const canSend = value.trim().length > 0 && !sending;

  const handleSend = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setValue('');
    } finally {
      setSending(false);
    }
  }, [onSend, value]);

  return (
    <View style={styles.bar}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder="Message"
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={2000}
        returnKeyType="default"
      />
      <AnimatedPressable
        onPress={handleSend}
        disabled={!canSend}
        style={[styles.sendButton, !canSend && styles.sendDisabled]}
      >
        <Ionicons name="arrow-up" size={20} color={colors.textOnPrimary} />
      </AnimatedPressable>
    </View>
  );
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.bg,
    },
    input: {
      flex: 1,
      maxHeight: 120,
      minHeight: 36,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontSize: 15,
      fontFamily: fonts.regular,
      color: colors.text,
      backgroundColor: colors.bgMuted,
      borderRadius: 18,
    },
    sendButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    sendDisabled: {
      backgroundColor: colors.textMuted,
    },
  });
