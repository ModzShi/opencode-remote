import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { radius } from '@/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Pressable>, 'children' | 'style'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const heights: Record<Size, number> = { sm: 34, md: 42, lg: 50 };
const fontSizes: Record<Size, number> = { sm: 13, md: 14.5, lg: 15.5 };
const paddings: Record<Size, number> = { sm: 12, md: 16, lg: 20 };
const gaps: Record<Size, number> = { sm: 6, md: 8, lg: 8 };

export const Button = React.forwardRef<React.ComponentRef<typeof Pressable>, ButtonProps>(
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
      textStyle,
      disabled,
      ...props
    },
    ref
  ) => {
    const { colors } = useTheme();

    const variants: Record<Variant, { bg: string; border: string; text: string; borderWidth: number }> = {
      primary: { bg: colors.primary, border: colors.primary, text: colors.primaryForeground, borderWidth: 0 },
      secondary: { bg: colors.secondary, border: colors.secondary, text: colors.secondaryForeground, borderWidth: 0 },
      outline: { bg: 'transparent', border: colors.border, text: colors.foreground, borderWidth: 1 },
      ghost: { bg: 'transparent', border: 'transparent', text: colors.foreground, borderWidth: 0 },
      destructive: { bg: colors.destructive, border: colors.destructive, text: colors.destructiveForeground, borderWidth: 0 },
    };

    const v = variants[variant];
    const isDisabled = disabled || loading;

    return (
      <Pressable
        ref={ref}
        disabled={isDisabled}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.base,
          {
            minHeight: heights[size],
            paddingHorizontal: paddings[size],
            gap: gaps[size],
            borderRadius: radius.md,
            backgroundColor: v.bg,
            borderColor: v.border,
            borderWidth: v.borderWidth,
            opacity: isDisabled ? 0.45 : pressed ? 0.82 : 1,
            width: fullWidth ? '100%' : undefined,
            alignSelf: fullWidth ? 'stretch' : 'flex-start',
          },
          style,
        ]}
        {...props}
      >
        {loading ? (
          <ActivityIndicator size="small" color={v.text} />
        ) : (
          <>
            {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
            <Text
              style={[
                styles.text,
                { color: v.text, fontSize: fontSizes[size] },
                textStyle,
              ]}
            >
              {children}
            </Text>
            {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
          </>
        )}
      </Pressable>
    );
  }
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  icon: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
