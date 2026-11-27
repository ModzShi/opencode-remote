import { Vibration } from 'react-native';
import { useAppStore } from '@/store';

/** Vibração curta respeitando a preferência do usuário. */
export function haptic(kind: 'tap' | 'light' | 'success' | 'error' = 'tap') {
  const { settings } = useAppStore.getState();
  if (!settings.hapticsEnabled) return;

  try {
    switch (kind) {
      case 'light':
        Vibration.vibrate(6);
        break;
      case 'success':
        Vibration.vibrate([0, 10, 40, 14]);
        break;
      case 'error':
        Vibration.vibrate([0, 24, 60, 24]);
        break;
      default:
        Vibration.vibrate(10);
    }
  } catch {
    // Vibração indisponível (simulador) — ignora.
  }
}