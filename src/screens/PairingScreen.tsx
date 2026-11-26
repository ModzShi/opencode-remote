import React, { useRef, useState } from 'react';
import {
  Alert,
  Clipboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store';
import { Button, Card, Input } from '@/components/ui';
import { QRScanner } from '@/components/QRScanner';
import { normalizeEndpoint, parsePairingPayload } from '@/utils/pairing';
import { websocket } from '@/utils/websocket';
import { PairingData } from '@/types';
import {
  Camera,
  Check,
  Copy,
  QrCode,
  Settings as SettingsIcon,
  Wifi,
  WifiOff,
} from 'lucide-react-native';
import { radius } from '@/theme';

const STATUS_LABEL: Record<string, string> = {
  connected: 'Conectado',
  connecting: 'Conectando…',
  reconnecting: 'Reconectando…',
  disconnected: 'Desconectado',
  error: 'Falha na conexão',
};

export default function PairingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const pairedSession = useAppStore((state) => state.pairedSession);
  const connectionStatus = useAppStore((state) => state.connectionStatus);
  const setPairedSession = useAppStore((state) => state.setPairedSession);
  const settings = useAppStore((state) => state.settings);
  const clearPairing = useAppStore((state) => state.clearPairing);

  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [copied, setCopied] = useState(false);

  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyPairing = (data: PairingData) => {
    websocket.connect(data);
    setPairedSession(data);
    if (settings.hapticsEnabled) Vibration.vibrate(40);
    router.replace('/(tabs)/terminal');
  };

  const handleScan = (raw: string): boolean => {
    const parsed = parsePairingPayload(raw);
    if (!parsed) {
      Alert.alert(
        'QR Code não reconhecido',
        'Use o QR Code gerado por "opencode pair --remote" no terminal do PC.'
      );
      return false;
    }

    setScannerOpen(false);
    applyPairing(parsed);
    return true;
  };

  const handleManualPair = () => {
    const parsed = parsePairingPayload(manualUrl);

    if (parsed?.publicKey) {
      applyPairing(parsed);
      return;
    }

    if (!manualUrl.trim() || !manualToken.trim()) {
      Alert.alert(
        'Dados incompletos',
        'Informe o endereço do PC e o token de pareamento.'
      );
      return;
    }

    applyPairing({
      endpoint: normalizeEndpoint(manualUrl),
      publicKey: manualToken.trim(),
      sessionId: `manual-${Date.now()}`,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
  };

  const copyCommand = () => {
    try {
      Clipboard.setString('opencode pair --remote');
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
      if (settings.hapticsEnabled) Vibration.vibrate(20);
    } catch {
      // Clipboard indisponível: ignora silenciosamente.
    }
  };

  const connected = connectionStatus === 'connected';
  const statusColor =
    connectionStatus === 'connected'
      ? colors.success
      : connectionStatus === 'error'
        ? colors.destructive
        : colors.warning;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={[styles.logo, { backgroundColor: colors.primaryMuted }]}>
            <Wifi size={22} color={colors.primary} />
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.title, { color: colors.foreground }]}>OpenCode Remote</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Controle o OpenCode do seu PC pelo celular
            </Text>
          </View>
        </View>

        <View style={[styles.segment, { backgroundColor: colors.muted }]}>
          <Pressable
            style={[
              styles.segmentItem,
              mode === 'scan' && {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setMode('scan')}
          >
            <QrCode
              size={15}
              color={mode === 'scan' ? colors.foreground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.segmentText,
                { color: mode === 'scan' ? colors.foreground : colors.mutedForeground },
              ]}
            >
              QR Code
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.segmentItem,
              mode === 'manual' && {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setMode('manual')}
          >
            <SettingsIcon
              size={15}
              color={mode === 'manual' ? colors.foreground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.segmentText,
                { color: mode === 'manual' ? colors.foreground : colors.mutedForeground },
              ]}
            >
              Manual
            </Text>
          </Pressable>
        </View>

        {mode === 'scan' ? (
          <Card style={styles.card}>
            <View style={[styles.scanIcon, { backgroundColor: colors.primaryMuted }]}>
              <QrCode size={28} color={colors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Parear com o PC</Text>
            <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
              No terminal do computador, rode o comando abaixo e escaneie o QR Code que aparecer.
            </Text>

            <Pressable
              onPress={copyCommand}
              style={[
                styles.command,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            >
              <Text
                style={[styles.commandText, { color: colors.foreground }]}
                numberOfLines={1}
              >
                opencode pair --remote
              </Text>
              {copied ? (
                <Check size={15} color={colors.success} />
              ) : (
                <Copy size={15} color={colors.mutedForeground} />
              )}
            </Pressable>

            <Button
              size="lg"
              fullWidth
              leftIcon={<Camera size={18} color={colors.primaryForeground} />}
              onPress={() => setScannerOpen(true)}
            >
              Abrir câmera
            </Button>
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Conexão manual
            </Text>
            <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
              Use os dados de <Text style={styles.inlineMono}>opencode pair --show-key</Text>.
            </Text>

            <Input
              label="Endereço do PC"
              placeholder="ws://192.168.0.10:4096"
              value={manualUrl}
              onChangeText={setManualUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              containerStyle={styles.field}
            />

            <Input
              label="Token de pareamento"
              placeholder="Cole a chave gerada pelo OpenCode"
              value={manualToken}
              onChangeText={setManualToken}
              autoCapitalize="none"
              autoCorrect={false}
              containerStyle={styles.field}
            />

            <Button size="lg" fullWidth onPress={handleManualPair}>
              Conectar
            </Button>
          </Card>
        )}

        <View style={styles.tips}>
          <Tip text="O celular e o PC precisam estar na mesma rede Wi-Fi." />
          <Tip text="O QR Code expira rápido. Gere um novo se necessário." />
        </View>

        {pairedSession ? (
          <Card style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <View style={styles.statusInfo}>
                <Text style={[styles.statusLabel, { color: colors.foreground }]}>
                  {STATUS_LABEL[connectionStatus] ?? connectionStatus}
                </Text>
                <Text
                  style={[styles.statusValue, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {pairedSession.endpoint}
                </Text>
              </View>
              {connected ? (
                <Wifi size={18} color={colors.success} />
              ) : (
                <WifiOff size={18} color={colors.mutedForeground} />
              )}
            </View>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => {
                websocket.disconnect();
                clearPairing();
              }}
              textStyle={{ color: colors.destructive }}
              style={styles.disconnect}
            >
              Desconectar
            </Button>
          </Card>
        ) : null}
      </ScrollView>

      <QRScanner
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        hapticsEnabled={settings.hapticsEnabled}
      />
    </KeyboardAvoidingView>
  );
}

function Tip({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.tipRow}>
      <View style={[styles.tipDot, { backgroundColor: colors.border }]} />
      <Text style={[styles.tipText, { color: colors.mutedForeground }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 14,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 6,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12.5,
    marginTop: 1,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.sm + 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    padding: 18,
    alignItems: 'stretch',
  },
  scanIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 14,
  },
  command: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  commandText: {
    fontSize: 12.5,
    fontWeight: '600',
    fontFamily: 'Menlo',
    flex: 1,
  },
  inlineMono: {
    fontFamily: 'Menlo',
    fontSize: 12,
  },
  field: {
    marginBottom: 12,
  },
  tips: {
    gap: 6,
    paddingHorizontal: 4,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  statusCard: {
    padding: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 11.5,
    marginTop: 1,
    fontFamily: 'Menlo',
  },
  disconnect: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
});
