import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ArrowUp } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { fonts, radius } from '@/theme';

interface ComposerProps {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  busy?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function Composer({
  value,
  onChangeText,
  onSend,
  busy = false,
  disabled = false,
  placeholder = 'Fale com o opencode…',
}: ComposerProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.box,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: focused ? colors.ring : colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          multiline
          editable={!disabled}
          textAlignVertical="top"
          style={[styles.input, { color: colors.foreground }]}
        />

        <Pressable
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
          style={({ pressed }) => [
            styles.send,
            {
              backgroundColor: canSend ? colors.primary : colors.secondary,
              transform: [{ scale: pressed && canSend ? 0.92 : 1 }],
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <ArrowUp
              size={18}
              strokeWidth={2.8}
              color={canSend ? colors.primaryForeground : colors.mutedForeground}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 12, paddingTop: 8 },
  box: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  input: {
    flex: 1,
    fontSize: 15.5,
    lineHeight: 21,
    fontFamily: fonts.mono,
    maxHeight: 128,
    minHeight: 32,
    paddingTop: 6,
    paddingBottom: 6,
  },
  send: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});