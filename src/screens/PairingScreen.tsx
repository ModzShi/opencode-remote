import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store';
import { Button, Card, Input } from '@/components/ui';
import { QRScanner } from '@/components/QRScanner';
import { Wifi, QrCode, Settings, HelpCircle, CheckCircle, AlertCircle, Loader2 } from 'lucide-react-native';
import { Linking, Clipboard, Vibration } from 'react-native';

export default function PairingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { pairedSession, setPairedSession, setConnectionStatus, connectionStatus, settings } = useAppStore();
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [manualUrl, setManualUrl] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  useEffect(() => {
    if (pairedSession && connectionStatus !== 'connected') {
      router.replace('/(tabs)/terminal');
    }
  }, [pairedSession, connectionStatus, router]);

  const handleScan = async (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'pairing' && parsed.payload) {
        await pairWithServer(parsed.payload);
      } else if (parsed.endpoint && parsed.publicKey) {
        await pairWithServer(parsed);
      } else {
        throw new Error('Formato de QR Code inválido');
      }
    } catch (e) {
      Alert.alert('Erro', 'QR Code inválido. Certifique-se de escanear o código do OpenCode.');
      setScanning(false);
    }
  };

  const pairWithServer = async (pairingData: any) => {
    setConnectionStatus('connecting');
    try {
      // Simula conexão - na versão real conecta via WebSocket
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (settings.hapticsEnabled) {
        Vibration.vibrate(50);
      }
      
      setPairedSession({
        sessionId: pairingData.sessionId || `session-${Date.now()}`,
        publicKey: pairingData.publicKey,
        endpoint: pairingData.endpoint || manualUrl,
        expiresAt: pairingData.expiresAt || Date.now() + 86400000,
      });
      
      setConnectionStatus('connected');
      router.replace('/(tabs)/terminal');
    } catch (error) {
      setConnectionStatus('error');
      setScanning(false);
      Alert.alert('Erro de Conexão', 'Não foi possível conectar ao servidor OpenCode.');
    }
  };

  const handleManualPair = async () => {
    if (!manualUrl || !manualToken) {
      Alert.alert('Campos Obrigatórios', 'Preencha a URL do servidor e o token de pareamento.');
      return;
    }
    await pairWithServer({
      endpoint: manualUrl,
      publicKey: manualToken,
      sessionId: `manual-${Date.now()}`,
      expiresAt: Date.now() + 86400000,
    });
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    if (settings.hapticsEnabled) Vibration.vibrate(30);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Wifi size={32} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.foreground }]}>OpenCode Remote</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Conecte ao seu PC via QR Code
            </Text>
          </View>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'scan' ? styles.modeButtonActive : {},
            ]}
            onPress={() => { setMode('scan'); setScanning(true); }}
          >
            <QrCode size={20} color={mode === 'scan' ? colors.primaryForeground : colors.mutedForeground} />
            <Text style={[
              styles.modeButtonText,
              { color: mode === 'scan' ? colors.primaryForeground : colors.mutedForeground }
            ]}>
              Escanear QR
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'manual' ? styles.modeButtonActive : {},
            ]}
            onPress={() => { setMode('manual'); setScanning(false); }}
          >
            <Settings size={20} color={mode === 'manual' ? colors.primaryForeground : colors.mutedForeground} />
            <Text style={[
              styles.modeButtonText,
              { color: mode === 'manual' ? colors.primaryForeground : colors.mutedForeground }
            ]}>
              Manual
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'scan' ? (
          <View style={styles.scanSection}>
            {scanning ? (
              <QRScanner
                onScan={handleScan}
                onClose={() => setScanning(false)}
              />
            ) : (
              <Card variant="outlined" style={styles.scanCard}>
                <View style={styles.scanCardContent}>
                  <QrCode size={64} color={colors.primary} style={styles.scanIcon} />
                  <Text style={[styles.scanTitle, { color: colors.foreground }]}>
                    Pronto para Escanear
                  </Text>
                  <Text style={[styles.scanDesc, { color: colors.mutedForeground }]}>
                    Toque no botão abaixo e aponte a câmera para o QR Code mostrado no terminal do OpenCode
                  </Text>
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    leftIcon={<QrCode size={20} color={colors.primaryForeground} />}
                    onPress={() => setScanning(true)}
                    style={styles.scanButton}
                  >
                    Abrir Câmera
                  </Button>
                </View>
              </Card>
            )}

            <Card variant="default" style={styles.helpCard}>
              <View style={styles.helpRow}>
                <HelpCircle size={20} color={colors.primary} />
                <Text style={[styles.helpText, { color: colors.foreground, flex: 1 }]}>
                  No terminal do PC, execute: <Text style={{ fontFamily: 'monospace', fontWeight: '600' }}> opencode pair --remote </Text>
                </Text>
              </View>
              <View style={styles.helpRow}>
                <HelpCircle size={20} color={colors.primary} />
                <Text style={[styles.helpText, { color: colors.foreground, flex: 1 }]}>
                  Ou gere o QR Code manualmente com: <Text style={{ fontFamily: 'monospace', fontWeight: '600' }}> opencode pair --show-key </Text>
                </Text>
              </View>
            </Card>
          </View>
        ) : (
          <View style={styles.manualSection}>
            <Card variant="default" style={styles.manualCard}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Configuração Manual
              </Text>
              <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
                Insira os dados obtidos com <Text style={{ fontFamily: 'monospace' }}>opencode pair --show-key</Text>
              </Text>

              <Input
                label="URL do Servidor (ex: ws://192.168.1.100:8080)"
                placeholder="ws://IP_DO_PC:PORTA"
                value={manualUrl}
                onChangeText={setManualUrl}
                style={styles.manualInput}
                autoCapitalize="none"
                keyboardType="url"
              />

              <Input
                label="Token de Pareamento / Chave Pública"
                placeholder="Cole a chave pública aqui"
                value={manualToken}
                onChangeText={setManualToken}
                style={styles.manualInput}
                autoCapitalize="none"
              />

              <Button
                variant="primary"
                fullWidth
                size="lg"
                onPress={handleManualPair}
                disabled={connectionStatus === 'connecting'}
                loading={connectionStatus === 'connecting'}
                style={styles.manualButton}
              >
                {connectionStatus === 'connecting' ? (
                  <>
                    <Loader2 size={20} color={colors.primaryForeground} style={styles.spinner} />
                    Conectando...
                  </>
                ) : (
                  'Conectar'
                )}
              </Button>
            </Card>
          </View>
        )}

        {/* Status */}
        {pairedSession && (
          <Card variant="elevated" style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={[
                styles.statusDot,
                { backgroundColor: connectionStatus === 'connected' ? colors.success : colors.warning }
              ]} />
              <View style={styles.statusInfo}>
                <Text style={[styles.statusLabel, { color: colors.foreground }]}>
                  {connectionStatus === 'connected' ? 'Conectado' : 'Conectando...'}
                </Text>
                <Text style={[styles.statusValue, { color: colors.mutedForeground, fontFamily: 'monospace' }]}>
                  {pairedSession.endpoint}
                </Text>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(77, 166, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 2,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderRadius: 12,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modeButtonActive: {
    backgroundColor: '#0066cc',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scanSection: { gap: 16 },
  scanCard: { padding: 32 },
  scanCardContent: { alignItems: 'center', gap: 16 },
  scanIcon: { opacity: 0.8 },
  scanTitle: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  scanDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  scanButton: { marginTop: 8 },
  helpCard: { padding: 16 },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  helpText: { fontSize: 13, lineHeight: 19 },
  manualSection: { gap: 16 },
  manualCard: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  sectionDesc: { fontSize: 13, lineHeight: 19, marginBottom: 20 },
  manualInput: { marginBottom: 16 },
  manualButton: { marginTop: 8 },
  statusCard: { padding: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusInfo: { flex: 1 },
  statusLabel: { fontSize: 14, fontWeight: '600' },
  statusValue: { fontSize: 12, marginTop: 2 },
  spinner: {
    // rotation animation would be added via Animated
  },
});