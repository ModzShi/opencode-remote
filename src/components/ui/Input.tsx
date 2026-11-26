import React from 'react';
import { TextInput, View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { radius } from '@/theme';

interface InputProps extends React.ComponentPropsWithoutRef<typeof TextInput> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = React.forwardRef<React.ComponentRef<typeof TextInput>, InputProps>(
  (
    { label, error, helperText, leftIcon, rightIcon, style, containerStyle, ...props },
    ref
  ) => {
    const { colors } = useTheme();

    return (
      <View style={[styles.container, containerStyle]}>
        {label ? (
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
        ) : null}
        <View
          style={[
            styles.inputWrapper,
            {
              borderColor: error ? colors.destructive : colors.inputBorder,
              backgroundColor: colors.input,
            },
          ]}
        >
          {leftIcon ? <View style={styles.iconWrapper}>{leftIcon}</View> : null}
          <TextInput
            ref={ref}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground }, style]}
            {...props}
          />
          {rightIcon ? <View style={styles.iconWrapper}>{rightIcon}</View> : null}
        </View>
        {error ? (
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        ) : helperText ? (
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>{helperText}</Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    minHeight: 42,
  },
  iconWrapper: {
    paddingHorizontal: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 5,
  },
  helperText: {
    fontSize: 12,
    marginTop: 5,
  },
});
