import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BarCodeScanner, BarCodeScannerResult, CameraType } from 'expo-barcode-scanner';
import { useTheme } from '@/hooks/useTheme';
import { Button, Card } from './ui';
import { Camera, X, ScanLine } from 'lucide-react-native';

export interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  flashOn?: boolean;
}

export const QRScanner = React.forwardRef<HTMLDivElement, QRScannerProps>(
  ({ onScan, onClose, flashOn = false }, ref) => {
    const { colors } = useTheme();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [cameraType, setCameraType] = useState<CameraType>(CameraType.back);
    const scannerRef = useRef<BarCodeScanner>(null);

    useEffect(() => {
      (async () => {
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    }, []);

    const handleBarCodeScanned = ({ data }: BarCodeScannerResult) => {
      if (scanned || !data) return;
      setScanned(true);
      onScan(data);
    };

    if (hasPermission === null) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Text style={[styles.text, { color: colors.foreground }]}>Solicitando permissão da câmera...</Text>
        </View>
      );
    }

    if (hasPermission === false) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Card variant="outlined" style={styles.permissionCard}>
            <Camera size={48} color={colors.foreground} style={styles.permissionIcon} />
            <Text style={[styles.permissionTitle, { color: colors.foreground }]}>Permissão de Câmera Necessária</Text>
            <Text style={[styles.permissionText, { color: colors.mutedForeground }]}>
              Para escanear o QR Code do OpenCode, precisamos acessar sua câmera.
            </Text>
            <Button variant="primary" onPress={onClose} style={styles.permissionButton}>
              Fechar
            </Button>
          </Card>
        </View>
      );
    }

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.scannerContainer}>
          <BarCodeScanner
            ref={scannerRef}
            onBarCodeScanned={handleBarCodeScanned}
            cameraType={cameraType}
            torchMode={flashOn ? 'on' : 'off'}
            style={StyleSheet.absoluteFillObject}
            barcodeTypes={['qr']}
          />
          <View style={styles.overlay}>
            <View style={styles.corners}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <ScanLine size={240} color={colors.primary} style={styles.scanLine} />
          </View>
        </View>

        <View style={styles.bottomControls}>
          <View style={styles.controlRow}>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Camera size={18} color={colors.foreground} />}
              onPress={() => setCameraType(cameraType === CameraType.back ? CameraType.front : CameraType.back)}
            >
              Trocar Câmera
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<X size={18} color={colors.destructive} />}
              onPress={onClose}
            >
              Cancelar
            </Button>
          </View>
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Aponte para o QR Code exibido no terminal do OpenCode
          </Text>
        </View>
      </View>
    );
  }
);

QRScanner.displayName = 'QRScanner';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
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
    borderTopColor: 'currentColor',
    borderLeftColor: 'currentColor',
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopColor: 'currentColor',
    borderRightColor: 'currentColor',
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomColor: 'currentColor',
    borderLeftColor: 'currentColor',
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomColor: 'currentColor',
    borderRightColor: 'currentColor',
  },
  scanLine: {
    position: 'absolute',
    width: 240,
    height: 2,
  },
  bottomControls: {
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  hintText: {
    textAlign: 'center',
    fontSize: 13,
  },
  permissionCard: {
    margin: 24,
    padding: 32,
    alignItems: 'center',
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
    minWidth: 120,
  },
});