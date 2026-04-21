import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors, type Colors } from '@/constants/colors';
import { fonts } from '@/constants/typography';

interface Props {
  body: string;
  isMine: boolean;
  showTail: boolean;
}

export default function MessageBubble({ body, isMine, showTail }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors, isMine, showTail), [colors, isMine, showTail]);

  return (
    <View style={styles.wrap}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{body}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: Colors, isMine: boolean, showTail: boolean) => {
  const mineBg = colors.primary;
  const theirBg = colors.bgMuted;
  return StyleSheet.create({
    wrap: {
      alignItems: isMine ? 'flex-end' : 'flex-start',
      paddingHorizontal: 12,
      marginTop: showTail ? 6 : 2,
      marginBottom: 0,
    },
    bubble: {
      maxWidth: '78%',
      paddingHorizontal: 14,
      paddingVertical: 9,
      backgroundColor: isMine ? mineBg : theirBg,
      borderRadius: 20,
      borderBottomRightRadius: isMine && showTail ? 6 : 20,
      borderBottomLeftRadius: !isMine && showTail ? 6 : 20,
    },
    text: {
      fontSize: 15,
      fontFamily: fonts.regular,
      color: isMine ? colors.textOnPrimary : colors.text,
      lineHeight: 20,
    },
  });
};
