import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowUp, FileText, Paperclip, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { fonts, radius } from '@/theme';
import type { ChatAttachment } from '@/types';

interface ComposerProps {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  busy?: boolean;
  disabled?: boolean;
  placeholder?: string;
  attachments?: ChatAttachment[];
  onAttach?: () => void;
  onRemoveAttachment?: (id: string) => void;
  attaching?: boolean;
}

export function Composer({
  value,
  onChangeText,
  onSend,
  busy = false,
  disabled = false,
  placeholder = 'Fale com o opencode…',
  attachments = [],
  onAttach,
  onRemoveAttachment,
  attaching = false,
}: ComposerProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const canSend = (value.trim().length > 0 || attachments.length > 0) && !disabled;

  return (
    <View style={styles.wrapper}>
      {attachments.length > 0 ? (
        <View style={styles.attachments}>
          {attachments.map((attachment) => (
            <View
              key={attachment.id}
              style={[styles.chip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              {attachment.kind === 'image' ? (
                <Image source={{ uri: attachment.uri }} style={styles.chipThumb} />
              ) : (
                <FileText size={15} color={colors.primary} strokeWidth={2.2} />
              )}
              <Text numberOfLines={1} style={[styles.chipName, { color: colors.foreground }]}>
                {attachment.name}
              </Text>
              <Pressable
                onPress={() => onRemoveAttachment?.(attachment.id)}
                hitSlop={9}
                accessibilityRole="button"
                accessibilityLabel={`Remover ${attachment.name}`}
              >
                <X size={13} color={colors.mutedForeground} strokeWidth={2.6} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

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
        {onAttach ? (
          <Pressable
            onPress={onAttach}
            disabled={disabled || attaching}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Anexar foto ou documento"
            style={({ pressed }) => [styles.attach, { opacity: pressed ? 0.6 : 1 }]}
          >
            {attaching ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Paperclip size={18} color={colors.mutedForeground} strokeWidth={2.2} />
            )}
          </Pressable>
        ) : null}

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
  attachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 7,
    paddingHorizontal: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8,
    paddingRight: 7,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '92%',
  },
  chipThumb: { width: 20, height: 20, borderRadius: 5 },
  chipName: { fontSize: 12, fontWeight: '600', maxWidth: 190 },
  attach: { width: 30, height: 34, alignItems: 'center', justifyContent: 'center' },
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