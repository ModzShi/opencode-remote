import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Brain, ChevronDown, ChevronRight, Wrench } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Avatar } from './Avatar';
import { ThinkingIndicator } from './ThinkingIndicator';
import { fonts, radius, space } from '@/theme';
import { MessagePart, OpenCodeMessage, ToolPart } from '@/types';
import { formatCount, truncate } from '@/utils/format';
import { Markdown } from './Markdown';

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const progress = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      delay,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, delay]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

function Caret() {
  const { colors } = useTheme();
  const pulse = useMemo(() => new Animated.Value(0.25), []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 520, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.25, duration: 520, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={{
        width: 8,
        height: 16,
        borderRadius: 2,
        backgroundColor: colors.primary,
        opacity: pulse,
        marginTop: 4,
      }}
    />
  );
}

function ToolRow({ part }: { part: ToolPart }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const statusColor =
    part.status === 'error' ? colors.destructive : part.status === 'running' ? colors.warning : colors.success;
  const detail = part.output ?? part.input ?? '';

  return (
    <View style={[styles.tool, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        style={styles.toolHead}
        accessibilityRole="button"
        accessibilityLabel={`Ferramenta ${part.name}`}
      >
        <Wrench size={13} color={colors.mutedForeground} strokeWidth={2.2} />
        <Text style={[styles.toolName, { color: colors.foreground }]} numberOfLines={1}>
          {part.name}
        </Text>
        <View style={[styles.toolDot, { backgroundColor: statusColor }]} />
        {detail ? (
          open ? (
            <ChevronDown size={14} color={colors.mutedForeground} />
          ) : (
            <ChevronRight size={14} color={colors.mutedForeground} />
          )
        ) : null}
      </Pressable>
      {detail && !open ? (
        <Text style={[styles.toolPreview, { color: colors.mutedForeground }]} numberOfLines={1}>
          {truncate(detail.replace(/\s+/g, ' '), 110)}
        </Text>
      ) : null}
      {detail && open ? (
        <Text selectable style={[styles.toolOutput, { color: colors.foreground, borderTopColor: colors.border }]}>
          {truncate(detail, 2600)}
        </Text>
      ) : null}
    </View>
  );
}

function Reasoning({ text }: { text: string }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.reasoning, { borderColor: colors.border }]}>
      <Pressable onPress={() => setOpen((value) => !value)} style={styles.reasoningHead}>
        <Brain size={13} color={colors.mutedForeground} strokeWidth={2.2} />
        <Text style={[styles.reasoningTitle, { color: colors.mutedForeground }]}>
          Raciocínio
        </Text>
        {open ? (
          <ChevronDown size={14} color={colors.mutedForeground} />
        ) : (
          <ChevronRight size={14} color={colors.mutedForeground} />
        )}
      </Pressable>
      {open ? (
        <Text selectable style={[styles.reasoningText, { color: colors.mutedForeground }]}>
          {text}
        </Text>
      ) : null}
    </View>
  );
}

interface MessageItemProps {
  message: OpenCodeMessage;
  fontSize?: number;
  showAvatar?: boolean;
}

export const MessageItem = React.memo(function MessageItem({
  message,
  fontSize = 15.5,
  showAvatar = true,
}: MessageItemProps) {
  const { colors } = useTheme();
  const parts: MessagePart[] = message.parts ?? (message.content ? [{ type: 'text', text: message.content }] : []);
  const reasoning = parts.find((part) => part.type === 'reasoning');
  const tools = parts.filter((part): part is ToolPart => part.type === 'tool');
  const text = parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('\n');

  if (message.role === 'user') {
    return (
      <FadeIn>
        <View style={styles.userRow}>
          <View
            style={[
              styles.userBubble,
              { backgroundColor: colors.bubbleUser, borderColor: colors.bubbleUserBorder },
            ]}
          >
            <Text selectable style={{ color: colors.foreground, fontSize, lineHeight: Math.round(fontSize * 1.45) }}>
              {message.content}
            </Text>
          </View>
        </View>
      </FadeIn>
    );
  }

  const model = message.model;
  const tokens = message.tokens;
  const meta = [
    model,
    tokens ? `${formatCount(tokens.output)} tok` : null,
    message.cost ? `$${message.cost.toFixed(4)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <FadeIn>
      <View style={styles.assistantRow}>
        <View style={styles.avatarColumn}>
          {showAvatar ? (
            <Avatar size={24} style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }} />
          ) : (
            <View style={styles.avatarSpacer} />
          )}
        </View>

        <View style={styles.assistantBody}>
          {reasoning && reasoning.type === 'reasoning' && reasoning.text ? (
            <Reasoning text={reasoning.text} />
          ) : null}

          {text ? (
            <View style={{ marginTop: reasoning ? 8 : 0 }}>
              <Markdown text={text} fontSize={fontSize} />
            </View>
          ) : message.streaming ? (
            <ThinkingIndicator />
          ) : null}

          {message.error ? (
            <View style={[styles.error, { backgroundColor: colors.errorSurface, borderColor: colors.destructive }]}>
              <AlertTriangle size={14} color={colors.destructive} strokeWidth={2.2} />
              <Text style={{ flex: 1, color: colors.destructive, fontSize: 12.5, lineHeight: 18 }}>
                {message.error}
              </Text>
            </View>
          ) : null}

          {tools.length ? (
            <View style={{ gap: 6, marginTop: 10 }}>
              {tools.map((part, index) => (
                <ToolRow key={`${part.name}-${index}`} part={part} />
              ))}
            </View>
          ) : null}

          {message.streaming && text ? <Caret /> : null}

          {meta && !message.streaming ? (
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>{meta}</Text>
          ) : null}
        </View>
      </View>
    </FadeIn>
  );
});

const styles = StyleSheet.create({
  userRow: { alignItems: 'flex-end', paddingHorizontal: space.lg, marginVertical: 5 },
  userBubble: {
    maxWidth: '86%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    borderBottomRightRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  assistantRow: { flexDirection: 'row', paddingHorizontal: space.lg, marginVertical: 7 },
  avatarColumn: { width: 30, alignItems: 'flex-start', paddingTop: 2 },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSpacer: { width: 24 },
  assistantBody: { flex: 1, paddingLeft: 10 },
  reasoning: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    minWidth: 150,
  },
  reasoningHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reasoningTitle: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.2 },
  reasoningText: { marginTop: 6, fontSize: 12.5, lineHeight: 19 },
  tool: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  toolHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  toolName: { flex: 1, fontSize: 12.5, fontWeight: '600' },
  toolDot: { width: 6, height: 6, borderRadius: 3 },
  toolPreview: { fontSize: 11.5, marginTop: 4 },
  toolOutput: {
    fontSize: 11.5,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    fontFamily: fonts.mono,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: 10,
    marginTop: 10,
  },
  meta: { fontSize: 10.5, marginTop: 8, letterSpacing: 0.2 },
});