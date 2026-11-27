import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { fonts, radius, space } from '@/theme';

type Block =
  | { kind: 'code'; lang: string; code: string }
  | { kind: 'p'; text: string }
  | { kind: 'h'; level: number; text: string }
  | { kind: 'li'; marker: string; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'hr' };

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g;

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  const paragraph: string[] = [];
  let inCode = false;
  let lang = '';
  let code: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ kind: 'p', text: paragraph.join('\n').trimEnd() });
      paragraph.length = 0;
    }
  };

  for (const line of source.split('\n')) {
    if (line.trimStart().startsWith('```')) {
      if (!inCode) {
        flush();
        inCode = true;
        lang = line.trim().slice(3).trim();
        code = [];
      } else {
        inCode = false;
        blocks.push({ kind: 'code', lang, code: code.join('\n') });
      }
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    if (!line.trim()) {
      flush();
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: 'h', level: heading[1].length, text: heading[2] });
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flush();
      blocks.push({ kind: 'quote', text: quote[1] });
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flush();
      blocks.push({ kind: 'hr' });
      continue;
    }

    const item = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (item) {
      flush();
      blocks.push({ kind: 'li', marker: /\d/.test(item[1]) ? item[1].replace(/[.)]$/, '') : '•', text: item[2] });
      continue;
    }

    paragraph.push(line);
  }

  if (inCode) blocks.push({ kind: 'code', lang, code: code.join('\n') });
  flush();
  return blocks;
}

interface MarkdownProps {
  text: string;
  fontSize?: number;
  color?: string;
}

export const Markdown = React.memo(function Markdown({ text, fontSize = 15.5, color }: MarkdownProps) {
  const { colors } = useTheme();
  const blocks = React.useMemo(() => parseBlocks(text), [text]);
  const baseColor = color ?? colors.foreground;
  const lineHeight = Math.round(fontSize * 1.55);

  const renderInline = (value: string, keyPrefix: string) => {
    const nodes: React.ReactNode[] = [];
    let last = 0;
    let index = 0;
    let match: RegExpExecArray | null;
    INLINE.lastIndex = 0;

    while ((match = INLINE.exec(value)) !== null) {
      if (match.index > last) nodes.push(value.slice(last, match.index));
      const token = match[0];
      const key = `${keyPrefix}-i${index++}`;

      if (token.startsWith('`')) {
        nodes.push(
          <Text key={key} style={{ fontFamily: fonts.mono, fontSize: fontSize - 1.5, color: colors.primary }}>
            {token.slice(1, -1)}
          </Text>
        );
      } else if (token.startsWith('**') || token.startsWith('__')) {
        nodes.push(
          <Text key={key} style={{ fontWeight: '700' }}>
            {token.slice(2, -2)}
          </Text>
        );
      } else if (token.startsWith('~~')) {
        nodes.push(
          <Text key={key} style={{ textDecorationLine: 'line-through', opacity: 0.7 }}>
            {token.slice(2, -2)}
          </Text>
        );
      } else if (token.startsWith('[')) {
        const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
        nodes.push(
          <Text key={key} style={{ color: colors.primary, textDecorationLine: 'underline' }}>
            {link ? link[1] : token}
          </Text>
        );
      } else {
        nodes.push(
          <Text key={key} style={{ fontStyle: 'italic', opacity: 0.92 }}>
            {token.slice(1, -1)}
          </Text>
        );
      }
      last = match.index + token.length;
    }

    if (last < value.length) nodes.push(value.slice(last));
    return nodes;
  };

  return (
    <View style={{ gap: 10 }}>
      {blocks.map((block, index) => {
        const key = `b${index}`;

        if (block.kind === 'code') {
          return (
            <View
              key={key}
              style={[
                styles.codeBlock,
                { backgroundColor: colors.codeBackground, borderColor: colors.codeBorder },
              ]}
            >
              {block.lang ? (
                <Text style={[styles.codeLang, { color: colors.mutedForeground }]}>{block.lang}</Text>
              ) : null}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Text
                  selectable
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSize - 1.5,
                    lineHeight: Math.round(fontSize * 1.5),
                    color: colors.foreground,
                  }}
                >
                  {block.code}
                </Text>
              </ScrollView>
            </View>
          );
        }

        if (block.kind === 'hr') {
          return <View key={key} style={[styles.hr, { backgroundColor: colors.border }]} />;
        }

        if (block.kind === 'quote') {
          return (
            <View key={key} style={[styles.quote, { borderLeftColor: colors.border }]}>
              <Text
                selectable
                style={{ color: colors.mutedForeground, fontSize, lineHeight, fontStyle: 'italic' }}
              >
                {renderInline(block.text, key)}
              </Text>
            </View>
          );
        }

        if (block.kind === 'li') {
          return (
            <View key={key} style={styles.liRow}>
              <Text style={[styles.liMarker, { color: colors.mutedForeground, fontSize }]}>
                {block.marker}
              </Text>
              <Text selectable style={{ flex: 1, color: baseColor, fontSize, lineHeight }}>
                {renderInline(block.text, key)}
              </Text>
            </View>
          );
        }

        if (block.kind === 'h') {
          const size = block.level <= 2 ? fontSize + 3 : fontSize + 1;
          return (
            <Text
              key={key}
              selectable
              style={{
                color: baseColor,
                fontSize: size,
                lineHeight: Math.round(size * 1.4),
                fontWeight: '700',
                marginTop: 2,
              }}
            >
              {renderInline(block.text, key)}
            </Text>
          );
        }

        return (
          <Text key={key} selectable style={{ color: baseColor, fontSize, lineHeight }}>
            {renderInline(block.text, key)}
          </Text>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  codeBlock: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  codeLang: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  hr: { height: StyleSheet.hairlineWidth },
  quote: { borderLeftWidth: 2, paddingLeft: space.md },
  liRow: { flexDirection: 'row', gap: 8 },
  liMarker: { minWidth: 14, fontWeight: '600' },
});