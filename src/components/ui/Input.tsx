import React from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface InputProps extends React.ComponentPropsWithoutRef<typeof TextInput> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      style,
      ...props
    },
    ref
  ) => {
    const { colors } = useTheme();

    return (
      <View style={styles.container}>
        {label && (
          <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
        )}
        <View
          style={[
            styles.inputWrapper,
            {
              borderColor: error ? colors.destructive : colors.inputBorder,
              backgroundColor: colors.input,
            },
          ]}
        >
          {leftIcon && (
            <View style={styles.iconWrapper}>{leftIcon}</View>
          )}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              { color: colors.foreground, paddingLeft: leftIcon ? 0 : undefined },
            ]}
            {...props}
          />
          {rightIcon && (
            <View style={styles.iconWrapper}>{rightIcon}</View>
          )}
        </View>
        {error && <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>}
        {!error && helperText && (
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>{helperText}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    gap: 6,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  iconWrapper: {
    paddingHorizontal: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
  },
});