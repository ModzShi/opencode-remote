import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface CardProps extends React.ComponentPropsWithoutRef<typeof View> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<View, CardProps>(
  ({ variant = 'default', padding = 'md', style, children, ...props }, ref) => {
    const { colors } = useTheme();

    const variantStyles = {
      default: {
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
      },
      elevated: {
        backgroundColor: colors.surfaceElevated,
        borderColor: 'transparent',
        borderWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      },
      outlined: {
        backgroundColor: 'transparent',
        borderColor: colors.border,
        borderWidth: 1.5,
      },
    };

    const paddingStyles = {
      none: 0,
      sm: 12,
      md: 16,
      lg: 24,
    };

    return (
      <View
        ref={ref}
        style={[
          styles.container,
          variantStyles[variant],
          { padding: paddingStyles[padding], borderRadius: 12 },
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
  container: {},
});