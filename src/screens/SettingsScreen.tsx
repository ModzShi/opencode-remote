import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store';
import { Button, Card, Input } from '@/components/ui';
import { Palette, Bell, Smartphone, HardDrive, Trash2, Info, Github, Share2, Moon, Sun, Monitor } from 'lucide-react-native';
import { Linking, Clipboard, Platform } from 'react-native';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const { colors, colorScheme, isDark } = useTheme();
  const { settings, setSettings, pairedSession, clearPairing, sessions, terminalOutput, fileTree } = useAppStore();
  const [showAbout, setShowAbout] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    setSettings({ theme });
  };

  const handleClearData = async () => {
    Alert.alert(
      'Limpar Todos os Dados',
      'Isso removerá o pareamento, sessões, histórico e configurações. Tem certeza?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpar', style: 'destructive', onPress: () => {
          clearPairing();
          setSettings({
            theme: 'system',
            autoConnect: true,
            hapticsEnabled: true,
            fontSize: 14,
            showLineNumbers: true,
            compactMode: false,
            autoScroll: true,
            keepAlive: true,
          });
        }},
      ]
    );
  };

  const copyDebugInfo = () => {
    const info = {
      appVersion: Constants.expoConfig?.version || '1.0.0',
      buildNumber: Constants.expoConfig?.ios?.buildNumber || '1',
      platform: Platform.OS,
      deviceName: Constants.deviceName ?? 'unknown',
      osVersion: Platform.Version,
      theme: settings.theme,
      paired: !!pairedSession,
      sessionsCount: sessions.length,
      logsCount: terminalOutput.length,
    };
    Clipboard.setString(JSON.stringify(info, null, 2));
  };

  const openGitHub = () => {
    Linking.openURL('https://github.com/opencode-ai/opencode');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Appearance Section */}
      <Card variant="default" style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Aparência</Text>
        
        <View style={styles.themeOptions}>
          {['system', 'light', 'dark'].map((theme) => (
            <TouchableOpacity
              key={theme}
              style={[
                styles.themeOption,
                settings.theme === theme && styles.themeOptionActive,
                { borderColor: settings.theme === theme ? colors.primary : colors.border }
              ]}
              onPress={() => handleThemeChange(theme as any)}
            >
              <View style={[
                styles.themeOptionIcon,
                { backgroundColor: settings.theme === theme ? colors.primary : colors.muted }
              ]}>
                {theme === 'system' && <Monitor size={20} color={settings.theme === theme ? colors.primaryForeground : colors.mutedForeground} />}
                {theme === 'light' && <Sun size={20} color={settings.theme === theme ? colors.primaryForeground : colors.mutedForeground} />}
                {theme === 'dark' && <Moon size={20} color={settings.theme === theme ? colors.primaryForeground : colors.mutedForeground} />}
              </View>
              <Text style={[
                styles.themeOptionLabel,
                { color: settings.theme === theme ? colors.primary : colors.foreground }
              ]}>
                {theme === 'system' ? 'Sistema' : theme === 'light' ? 'Claro' : 'Escuro'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Terminal Section */}
      <Card variant="default" style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Terminal</Text>
        
        <View style={styles.settingsList}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>Tamanho da Fonte</Text>
              <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>
                {settings.fontSize}px
              </Text>
            </View>
            <View style={styles.sliderContainer}>
              <Text style={{ color: colors.mutedForeground, minWidth: 24 }}>{Math.max(10, settings.fontSize - 4)}</Text>
              <View style={{ flex: 1 }}>
                {/* Slider would go here - using buttons for simplicity */}
              </View>
              <Text style={{ color: colors.mutedForeground, minWidth: 24, textAlign: 'right' }}>{Math.min(24, settings.fontSize + 4)}</Text>
            </View>
          </View>
          
          <View style={styles.fontSizeButtons}>
            {[12, 14, 16, 18, 20].map(size => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.fontSizeBtn,
                  settings.fontSize === size && styles.fontSizeBtnActive,
                  { backgroundColor: settings.fontSize === size ? colors.primary : colors.muted }
                ]}
                onPress={() => setSettings({ fontSize: size })}
              >
                <Text style={[
                  styles.fontSizeBtnText,
                  { color: settings.fontSize === size ? colors.primaryForeground : colors.foreground }
                ]}>
                  {size}px
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.toggleList}>
          {[
            { key: 'showLineNumbers', label: 'Números de Linha', desc: 'Mostrar numeração nas linhas' },
            { key: 'compactMode', label: 'Modo Compacto', desc: 'Reduzir espaçamento vertical' },
            { key: 'autoScroll', label: 'Auto Scroll', desc: 'Rolar automaticamente para novas mensagens' },
            { key: 'keepAlive', label: 'Manter Conexão', desc: 'Manter WebSocket ativo em background' },
          ].map(({ key, label, desc }) => (
            <View key={key} style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text>
                <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>{desc}</Text>
              </View>
              <Switch
                value={settings[key as keyof typeof settings] as boolean}
                onValueChange={(v) => setSettings({ [key]: v })}
                thumbColor={isDark ? '#fff' : '#000'}
                trackColor={{ false: colors.muted, true: colors.primary }}
              />
            </View>
          ))}
        </View>
      </Card>

      {/* Behavior Section */}
      <Card variant="default" style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Comportamento</Text>
        
        <View style={styles.toggleList}>
          {[
            { key: 'autoConnect', label: 'Auto-conectar', desc: 'Conectar automaticamente ao abrir o app' },
            { key: 'hapticsEnabled', label: 'Feedback Tátil', desc: 'Vibração em ações e conexões' },
          ].map(({ key, label, desc }) => (
            <View key={key} style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text>
                <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>{desc}</Text>
              </View>
              <Switch
                value={settings[key as keyof typeof settings] as boolean}
                onValueChange={(v) => setSettings({ [key]: v })}
                thumbColor={isDark ? '#fff' : '#000'}
                trackColor={{ false: colors.muted, true: colors.primary }}
              />
            </View>
          ))}
        </View>
      </Card>

      {/* Connection Section */}
      {pairedSession && (
        <Card variant="default" style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Conexão Ativa</Text>
          <View style={styles.connectionInfo}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Endpoint</Text>
              <Text style={[styles.infoValue, { color: colors.foreground, fontFamily: 'monospace' }]}>
                {pairedSession.endpoint}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Sessão</Text>
              <Text style={[styles.infoValue, { color: colors.foreground, fontFamily: 'monospace' }]}>
                {pairedSession.sessionId}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Expira em</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {new Date(pairedSession.expiresAt).toLocaleString('pt-BR')}
              </Text>
            </View>
          </View>
          <Button
            variant="destructive"
            fullWidth
            leftIcon={<Trash2 size={18} color={colors.destructiveForeground} />}
            onPress={() => Alert.alert(
              'Desconectar',
              'Isso removerá o pareamento. Você precisará escanear o QR Code novamente.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Desconectar', style: 'destructive', onPress: clearPairing },
              ]
            )}
            style={styles.disconnectButton}
          >
            Desconectar
          </Button>
        </Card>
      )}

      {/* Debug Section */}
      <Card variant="default" style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Depuração</Text>
        
        <View style={styles.debugButtons}>
          <Button
            variant="outline"
            fullWidth
            leftIcon={<Info size={18} color={colors.foreground} />}
            onPress={() => setShowAbout(true)}
          >
            Informações do App
          </Button>
          <Button
            variant="outline"
            fullWidth
            leftIcon={<HardDrive size={18} color={colors.foreground} />}
            onPress={copyDebugInfo}
          >
            Copiar Info de Debug
          </Button>
          <Button
            variant="outline"
            fullWidth
            leftIcon={<Github size={18} color={colors.foreground} />}
            onPress={openGitHub}
          >
            OpenCode no GitHub
          </Button>
          <Button
            variant="outline"
            fullWidth
            leftIcon={<Share2 size={18} color={colors.foreground} />}
            onPress={() => Linking.openURL('mailto:support@opencode.ai?subject=OpenCode Remote App')}
          >
            Reportar Problema
          </Button>
        </View>
      </Card>

      {/* Version Footer */}
      <View style={styles.footer}>
        <Text style={[styles.versionText, { color: colors.mutedForeground }]}>
          OpenCode Remote v{Constants.expoConfig?.version || '1.0.0'} (build {Constants.expoConfig?.ios?.buildNumber || '1'})
        </Text>
        <Text style={[styles.versionText, { color: colors.mutedForeground }]}>
          Powered by Expo & React Native
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  sectionCard: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  themeOptionActive: {},
  themeOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  settingsList: {
    gap: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 200,
  },
  fontSizeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fontSizeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  fontSizeBtnActive: {},
  fontSizeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleList: {
    gap: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  toggleInfo: { flex: 1 },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  toggleDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  connectionInfo: {
    gap: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  disconnectButton: { marginTop: 8 },
  debugButtons: {
    gap: 8,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    gap: 4,
  },
  versionText: {
    fontSize: 12,
  },
});