import { Keyboard, TouchableWithoutFeedback, View, ViewProps } from 'react-native';

export default function DismissKeyboardView({ children, style }: ViewProps) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={style}>{children}</View>
    </TouchableWithoutFeedback>
  );
}
