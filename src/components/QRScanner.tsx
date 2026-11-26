import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '@/hooks/useTheme';
import { Button, Card } from './ui';
import { Camera, X, ScanLine, SwitchCamera } from 'lucide-react-native';

export interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  flashOn?: boolean;
}

export function QRScanner({ onScan, onClose, flashOn = false }: QRScannerProps) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState(flashOn);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || !data) return;
    setScanned(true);
    onScan(data);
  };

  // Permission still loading
  if (!permission) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.foreground }]}>Carregando câmera...</Text>
      </View>
    );
  }

  // Permission not granted
  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Card variant="outlined" style={styles.permissionCard}>
          <Camera size={48} color={colors.foreground} style={styles.permissionIcon} />
          <Text style={[styles.permissionTitle, { color: colors.foreground }]}>
            Permissão de Câmera Necessária
          </Text>
          <Text style={[styles.permissionText, { color: colors.mutedForeground }]}>
            Para escanear o QR Code do OpenCode, precisamos acessar sua câmera.
          </Text>
          <Button variant="primary" onPress={requestPermission} style={styles.permissionButton}>
            Permitir Câmera
          </Button>
          <Button variant="ghost" onPress={onClose} style={styles.permissionButton}>
            Cancelar
          </Button>
        </Card>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing={facing}
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.corners}>
            <View style={[styles.corner, styles.topLeft, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.topRight, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.bottomRight, { borderColor: colors.primary }]} />
          </View>
          <ScanLine size={240} color={colors.primary} style={styles.scanLine} />
        </View>
      </View>

      <View style={styles.bottomControls}>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
          >
            <SwitchCamera size={22} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setTorch(!torch)}
          >
            <ScanLine size={22} color={torch ? colors.primary : colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={onClose}>
            <X size={22} color={colors.destructive} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
          Aponte para o QR Code exibido no terminal do OpenCode
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    fontSize: 15,
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corners: {
    width: 240,
    height: 240,
    position: 'absolute',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLine: {
    position: 'absolute',
    width: 240,
    height: 2,
  },
  bottomControls: {
    padding: 24,
    paddingBottom: 32,
    gap: 16,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  hintText: {
    textAlign: 'center',
    fontSize: 13,
  },
  permissionCard: {
    padding: 32,
    alignItems: 'center',
    width: '100%',
  },
  permissionIcon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  permissionButton: {
    minWidth: 160,
    marginBottom: 8,
  },
});