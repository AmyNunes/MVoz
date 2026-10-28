import { isRunningInExpoGo } from 'expo';

type NotificationsModule = typeof import('expo-notifications');
type TaskManagerModule = typeof import('expo-task-manager');

/**
 * No Expo Go do Android o `expo-notifications` nem carrega (faltam módulos nativos
 * desde o SDK 53). Por isso ele só é carregado no app instalado (development build/APK),
 * e nunca por `import` no topo de um arquivo.
 */
export const notificationsSupported = !isRunningInExpoGo();

let notifications: NotificationsModule | null = null;
let taskManager: TaskManagerModule | null = null;

export function getNotifications(): NotificationsModule | null {
  if (!notificationsSupported) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- carregar só aqui é o objetivo (no Expo Go o import quebra)
  notifications ??= require('expo-notifications') as NotificationsModule;
  return notifications;
}

export function getTaskManager(): TaskManagerModule | null {
  if (!notificationsSupported) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- idem: só no app instalado
  taskManager ??= require('expo-task-manager') as TaskManagerModule;
  return taskManager;
}
