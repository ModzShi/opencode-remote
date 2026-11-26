import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Flashlight, FlashlightOff, SwitchCamera, X } from 'lucide-react-native';

export interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  /** Retorne `true` se o QR foi aceito (fecha o scanner). */
  onScan: (data: string) => boolean;
  hapticsEnabled?: boolean;
}

const FRAME = 252;
const ACCENT = '#6EA8FE';

export function QRScanner({ visible, onClose, onScan, hapticsEnabled = true }: QRScannerProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);

  const scannedRef = useRef(false);
  const askedRef = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      scannedRef.current = false;
      askedRef.current = false;
      setTorch(false);
      setMountError(null);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(lineAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(lineAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [visible, lineAnim]);

  useEffect(() => {
    if (!visible || !permission) return;
    if (!permission.granted && permission.canAskAgain && !askedRef.current) {
      askedRef.current = true;
      requestPermission().catch(() => {});
    }
  }, [visible, permission, requestPermission]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scannedRef.current || !data) return;
    scannedRef.current = true;
    if (hapticsEnabled) Vibration.vibrate(35);

    const accepted = onScan(data);
    if (!accepted) {
      resetTimer.current = setTimeout(() => {
        scannedRef.current = false;
      }, 1600);
    }
  };

  if (!visible) return null;

  const granted = permission?.granted === true;

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {granted && !mountError ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing={facing}
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
            onMountError={(event) => setMountError(event.message)}
          />
        ) : (
          <View style={styles.cameraFallback} />
        )}

        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.topTitle}>Escanear QR Code</Text>
          <TouchableOpacity style={styles.roundButton} onPress={onClose} accessibilityLabel="Fechar">
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {!granted || mountError ? (
          <View style={styles.permissionBox}>
            <View style={styles.permissionIcon}>
              <Camera size={30} color="#FFFFFF" />
            </View>
            <Text style={styles.permissionTitle}>
              {mountError ? 'Câmera indisponível' : 'Acesso à câmera'}
            </Text>
            <Text style={styles.permissionText}>
              {mountError
                ? 'Não foi possível iniciar a câmera. Feche o app e tente novamente.'
                : 'Precisamos da câmera para ler o QR Code de pareamento do OpenCode.'}
            </Text>
            {!mountError && permission ? (
              permission.canAskAgain ? (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => requestPermission().catch(() => {})}
                >
                  <Text style={styles.primaryButtonText}>Permitir acesso</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => Linking.openSettings()}
                >
                  <Text style={styles.primaryButtonText}>Abrir Ajustes</Text>
                </TouchableOpacity>
              )
            ) : null}
            {!permission ? <ActivityIndicator color={ACCENT} style={{ marginTop: 18 }} /> : null}
          </View>
        ) : (
          <View style={styles.frameArea} pointerEvents="none">
            <View style={styles.frame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [
                      {
                        translateY: lineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, FRAME - 4],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Bottom controls */}
        {granted && !mountError ? (
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) + 10 }]}>
            <Text style={styles.hint}>Aponte para o QR Code exibido no PC</Text>
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.controlButton, torch && styles.controlButtonActive]}
                onPress={() => setTorch((value) => !value)}
                accessibilityLabel="Lanterna"
              >
                {torch ? (
                  <FlashlightOff size={21} color="#0B0D12" />
                ) : (
                  <Flashlight size={21} color="#FFFFFF" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => setFacing((value) => (value === 'back' ? 'front' : 'back'))}
                accessibilityLabel="Virar câmera"
              >
                <SwitchCamera size={21} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#05070B',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  roundButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  frameArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME,
    height: FRAME,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: ACCENT,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 18,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 18,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 18,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 18,
  },
  scanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 0,
    height: 2,
    borderRadius: 2,
    backgroundColor: ACCENT,
    opacity: 0.9,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingTop: 18,
    gap: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  hint: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    gap: 22,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  controlButtonActive: {
    backgroundColor: ACCENT,
  },
  permissionBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  permissionIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginBottom: 18,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 22,
  },
  primaryButton: {
    minHeight: 46,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
  },
  primaryButtonText: {
    color: '#08111F',
    fontSize: 15,
    fontWeight: '700',
  },
});
