import React, { useRef, useState } from 'react';
import {
  Alert,
  Clipboard,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store';
import { Button, Card } from '@/components/ui';
import {
  Check,
  Copy,
  Globe,
  Info,
  Monitor,
  Moon,
  RotateCcw,
  Sun,
  Trash2,
} from 'lucide-react-native';
import { radius } from '@/theme';

type ThemeOption = 'system' | 'light' | 'dark';

const THEMES: { value: ThemeOption; label: string; icon: typeof Monitor }[] = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
];

const STATUS_LABEL: Record<string, string> = {
  connected: 'Conectado',
  connecting: 'Conectando…',
  reconnecting: 'Reconectando…',
  disconnected: 'Desconectado',
  error: 'Falha na conexão',
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const settings = useAppStore((state) => state.settings);
  const setSettings = useAppStore((state) => state.setSettings);
  const resetSettings = useAppStore((state) => state.resetSettings);
  const pairedSession = useAppStore((state) => state.pairedSession);
  const connectionStatus = useAppStore((state) => state.connectionStatus);
  const clearPairing = useAppStore((state) => state.clearPairing);
  const clearTerminal = useAppStore((state) => state.clearTerminal);
  const sessions = useAppStore((state) => state.sessions);
  const outputCount = useAppStore((state) => state.terminalOutput.length);

  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const changeFontSize = (delta: number) => {
    const next = Math.min(22, Math.max(11, settings.fontSize + delta));
    setSettings({ fontSize: next });
  };

  const copyDebugInfo = () => {
    const info = {
      app: 'OpenCode Remote',
      version: Constants.expoConfig?.version ?? '1.0.0',
      build: Constants.expoConfig?.ios?.buildNumber ?? '1',
      platform: Platform.OS,
      osVersion: String(Platform.Version),
      theme: settings.theme,
      paired: Boolean(pairedSession),
      endpoint: pairedSession?.endpoint ?? null,
      sessions: sessions.length,
      outputLines: outputCount,
    };

    try {
      Clipboard.setString(JSON.stringify(info, null, 2));
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      Alert.alert('Não foi possível copiar', JSON.stringify(info, null, 2));
    }
  };

  const confirmResetSettings = () => {
    Alert.alert('Restaurar padrões', 'As preferências voltam ao padrão de fábrica.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Restaurar', style: 'destructive', onPress: resetSettings },
    ]);
  };

  const confirmClearData = () => {
    Alert.alert(
      'Limpar dados',
      'Remove o pareamento, as preferências e o histórico do terminal.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: () => {
            clearPairing();
            clearTerminal();
            resetSettings();
          },
        },
      ]
    );
  };

  const statusColor =
    connectionStatus === 'connected'
      ? colors.success
      : connectionStatus === 'error'
        ? colors.destructive
        : colors.warning;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Ajustes</Text>

      <Section title="Aparência">
        <View style={styles.themeRow}>
          {THEMES.map(({ value, label, icon: Icon }) => {
            const active = settings.theme === value;
            return (
              <Pressable
                key={value}
                onPress={() => setSettings({ theme: value })}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: active ? colors.primaryMuted : colors.muted,
                    borderColor: active ? colors.primary : 'transparent',
                  },
                ]}
              >
                <Icon
                  size={17}
                  color={active ? colors.primary : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.themeLabel,
                    { color: active ? colors.primary : colors.mutedForeground },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>
              Tamanho da fonte
            </Text>
            <Text style={[styles.rowHint, { color: colors.mutedForeground }]}>
              Texto do terminal
            </Text>
          </View>
          <View style={[styles.stepper, { backgroundColor: colors.muted }]}>
            <Pressable
              onPress={() => changeFontSize(-1)}
              style={styles.stepperButton}
              hitSlop={8}
            >
              <Text style={[styles.stepperSymbol, { color: colors.foreground }]}>−</Text>
            </Pressable>
            <Text style={[styles.stepperValue, { color: colors.foreground }]}>
              {settings.fontSize}px
            </Text>
            <Pressable
              onPress={() => changeFontSize(1)}
              style={styles.stepperButton}
              hitSlop={8}
            >
              <Text style={[styles.stepperSymbol, { color: colors.foreground }]}>+</Text>
            </Pressable>
          </View>
        </View>
      </Section>

      <Section title="Terminal">
        <ToggleRow
          label="Números de linha"
          hint="Mostra a numeração à esquerda"
          value={settings.showLineNumbers}
          onChange={(value) => setSettings({ showLineNumbers: value })}
        />
        <ToggleRow
          label="Modo compacto"
          hint="Menos espaço entre as linhas"
          value={settings.compactMode}
          onChange={(value) => setSettings({ compactMode: value })}
        />
        <ToggleRow
          label="Rolagem automática"
          hint="Acompanha a saída mais recente"
          value={settings.autoScroll}
          onChange={(value) => setSettings({ autoScroll: value })}
          last
        />
      </Section>

      <Section title="Comportamento">
        <ToggleRow
          label="Auto-conectar"
          hint="Reconecta ao abrir o app"
          value={settings.autoConnect}
          onChange={(value) => setSettings({ autoConnect: value })}
        />
        <ToggleRow
          label="Vibração"
          hint="Feedback tátil nas ações"
          value={settings.hapticsEnabled}
          onChange={(value) => setSettings({ hapticsEnabled: value })}
          last
        />
      </Section>

      <Section title="Conexão">
        {pairedSession ? (
          <>
            <View style={styles.row}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>
                  {STATUS_LABEL[connectionStatus] ?? connectionStatus}
                </Text>
                <Text
                  style={[styles.rowHint, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {pairedSession.endpoint}
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.paddedRow}>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Trash2 size={15} color={colors.destructive} />}
                onPress={() =>
                  Alert.alert(
                    'Desconectar',
                    'Você precisará escanear o QR Code novamente.',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Desconectar', style: 'destructive', onPress: clearPairing },
                    ]
                  )
                }
                textStyle={{ color: colors.destructive }}
              >
                Desconectar
              </Button>
            </View>
          </>
        ) : (
          <View style={styles.paddedRow}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Nenhum PC pareado ainda.
            </Text>
          </View>
        )}
      </Section>

      <Section title="Dados e suporte">
        <Row
          label="Copiar informações"
          hint="Versão, conexão e estado do app"
          onPress={copyDebugInfo}
          right={
            copied ? (
              <Check size={17} color={colors.success} />
            ) : (
              <Copy size={17} color={colors.mutedForeground} />
            )
          }
        />
        <Row
          label="OpenCode no GitHub"
          hint="Abrir repositório oficial"
          onPress={() => Linking.openURL('https://github.com/sst/opencode')}
          right={<Globe size={17} color={colors.mutedForeground} />}
        />
        <Row
          label="Restaurar padrões"
          hint="Voltar as preferências originais"
          onPress={confirmResetSettings}
          right={<RotateCcw size={17} color={colors.mutedForeground} />}
        />
        <Row
          label="Limpar dados"
          hint="Pareamento, preferências e histórico"
          onPress={confirmClearData}
          destructive
          right={<Trash2 size={17} color={colors.destructive} />}
          last
        />
      </Section>

      <View style={styles.footer}>
        <Info size={13} color={colors.mutedForeground} />
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          OpenCode Remote v{Constants.expoConfig?.version ?? '1.0.0'} · build{' '}
          {Constants.expoConfig?.ios?.buildNumber ?? '1'}
        </Text>
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
        {title.toUpperCase()}
      </Text>
      <Card padding="none">{children}</Card>
    </View>
  );
}

function Row({
  label,
  hint,
  right,
  onPress,
  destructive,
  last,
}: {
  label: string;
  hint?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  last?: boolean;
}) {
  const { colors } = useTheme();

  const content = (
    <>
      <View style={styles.rowText}>
        <Text
          style={[
            styles.rowLabel,
            { color: destructive ? colors.destructive : colors.foreground },
          ]}
        >
          {label}
        </Text>
        {hint ? (
          <Text style={[styles.rowHint, { color: colors.mutedForeground }]}>{hint}</Text>
        ) : null}
      </View>
      {right}
    </>
  );

  const rowStyle = [
    styles.row,
    !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [rowStyle, pressed && { opacity: 0.65 }]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={rowStyle}>{content}</View>;
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
  last,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  last?: boolean;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.row,
        !last && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
        {hint ? (
          <Text style={[styles.rowHint, { color: colors.mutedForeground }]}>{hint}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.muted, true: colors.primary }}
        thumbColor={isDark ? '#F4F6FA' : '#FFFFFF'}
        ios_backgroundColor={colors.muted}
        style={styles.switch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 16,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  section: {
    gap: 7,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginLeft: 4,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  themeLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 52,
  },
  paddedRow: {
    padding: 14,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    fontSize: 14.5,
    fontWeight: '500',
  },
  rowHint: {
    fontSize: 11.5,
    lineHeight: 15,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: 2,
  },
  stepperButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSymbol: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  stepperValue: {
    fontSize: 12.5,
    fontWeight: '700',
    minWidth: 34,
    textAlign: 'center',
  },
  switch: {
    transform: [{ scale: 0.9 }],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 2,
  },
  emptyText: {
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  footerText: {
    fontSize: 11,
  },
});
