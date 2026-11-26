import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface ButtonProps extends React.ComponentPropsWithoutRef<typeof Pressable> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<Pressable, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      style,
      disabled,
      ...props
    },
    ref
  ) => {
    const { colors } = useTheme();

    const variantStyles = {
      primary: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        textColor: colors.primaryForeground,
      },
      secondary: {
        backgroundColor: colors.secondary,
        borderColor: colors.secondary,
        textColor: colors.secondaryForeground,
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: colors.border,
        textColor: colors.foreground,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: colors.foreground,
      },
      destructive: {
        backgroundColor: colors.destructive,
        borderColor: colors.destructive,
        textColor: colors.destructiveForeground,
      },
    };

    const sizeStyles = {
      sm: { paddingHorizontal: 12, paddingVertical: 6, fontSize: 13, gap: 6 },
      md: { paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, gap: 8 },
      lg: { paddingHorizontal: 24, paddingVertical: 14, fontSize: 17, gap: 10 },
    };

    const v = variantStyles[variant];
    const s = sizeStyles[size];
    const isDisabled = disabled || loading;

    return (
      <Pressable
        ref={ref}
        disabled={isDisabled}
        style={[
          styles.container,
          {
            backgroundColor: v.backgroundColor,
            borderColor: v.borderColor,
            borderWidth: variant === 'outline' ? 1 : 0,
            ...s,
            opacity: isDisabled ? 0.5 : 1,
            width: fullWidth ? '100%' : 'auto',
          },
          style,
        ]}
        {...props}
      >
        {loading ? (
          <View style={styles.spinner} />
        ) : (
          <>
            {leftIcon && <View style={styles.icon}>{leftIcon}</View>}
            <Text
              style={[
                styles.text,
                { color: v.textColor, fontSize: s.fontSize },
              ]}
            >
              {children}
            </Text>
            {rightIcon && <View style={styles.icon}>{rightIcon}</View>}
          </>
        )}
      </Pressable>
    );
  }
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    minHeight: 44,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  icon: {
    flexShrink: 0,
  },
  spinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'currentColor',
    borderTopColor: 'transparent',
  },
});