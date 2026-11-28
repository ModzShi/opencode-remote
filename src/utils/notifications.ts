import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import { useAppStore } from '@/store';

/*
 * Avisos de tarefa. O app só recebe eventos com o processo vivo; em segundo
 * plano (ou logo depois de sair) isso vira uma notificação local. Para o app
 * totalmente fechado seria preciso push do servidor, que ainda não está ligado.
 */

let configured = false;

export function setupNotifications() {
  if (configured) return;
  configured = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      void Notifications.setNotificationChannelAsync('tasks', {
        name: 'Tarefas do OpenCode',
        importance: AndroidImportance.DEFAULT,
      }).catch(() => undefined);
    }
  } catch {
    // módulo ausente em binário antigo
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const next = await Notifications.requestPermissionsAsync();
    return next.granted;
  } catch {
    return false;
  }
}

/** Pede a permissão enquanto o app está na frente (na primeira tarefa). */
export function primeNotifications(): void {
  if (useAppStore.getState().settings.backgroundNotifications === false) return;
  if (AppState.currentState !== 'active') return;
  setupNotifications();
  void ensureNotificationPermission();
}

const lastSent = new Map<string, number>();

/** Mostra o aviso só quando o app não está na frente (evita duplicar a tela). */
export async function notifyTask(key: string, title: string, body: string): Promise<void> {
  if (useAppStore.getState().settings.backgroundNotifications === false) return;
  if (AppState.currentState === 'active') return;

  const now = Date.now();
  if (now - (lastSent.get(key) ?? 0) < 5000) return;
  lastSent.set(key, now);

  setupNotifications();
  if (!(await ensureNotificationPermission())) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: false },
      trigger: null,
    });
  } catch {
    // sem permissão ou módulo indisponível
  }
}
