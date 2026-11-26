import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { radius } from '@/theme';

interface CardProps extends React.ComponentPropsWithoutRef<typeof View> {
  variant?: 'default' | 'elevated' | 'outlined' | 'plain';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddings = { none: 0, sm: 10, md: 14, lg: 18 };

export const Card = React.forwardRef<React.ComponentRef<typeof View>, CardProps>(
  ({ variant = 'default', padding = 'md', style, children, ...props }, ref) => {
    const { colors, isDark } = useTheme();

    const variants = {
      default: {
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: StyleSheet.hairlineWidth,
      },
      elevated: {
        backgroundColor: colors.surfaceElevated,
        borderColor: colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.35 : 0.08,
        shadowRadius: 14,
        elevation: 6,
      },
      outlined: {
        backgroundColor: 'transparent',
        borderColor: colors.border,
        borderWidth: 1,
      },
      plain: {
        backgroundColor: colors.surface,
        borderColor: 'transparent',
        borderWidth: 0,
      },
    } as const;

    return (
      <View
        ref={ref}
        style={[
          styles.container,
          { borderRadius: radius.lg, padding: paddings[padding] },
          variants[variant],
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    );
  }
);

Card.displayName = 'Card';

const styles = StyleSheet.create({
  container: {
    // sem overflow: hidden para não cortar a sombra do variant elevated
  },
});
