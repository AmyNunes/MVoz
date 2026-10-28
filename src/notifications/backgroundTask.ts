import { ACTION_LATER } from './channels';
import { getNotifications, getTaskManager } from './native';
import { snooze } from './scheduler';

/**
 * Tarefa em segundo plano: no Android, recebe o toque em "Mais tarde (+1 h)"
 * mesmo com o app fechado e reagenda o aviso sem abrir o app.
 * Precisa ser definida no carregamento do app (index.ts).
 */
export const NOTIFICATION_TASK = 'mvoz-notification-actions';

type TaskData = {
  actionIdentifier?: string;
  notification?: { request?: { identifier?: string; content?: Parameters<typeof snooze>[0] } };
};

/** Define a tarefa (só no app instalado; no Expo Go não faz nada). */
export function defineNotificationTask(): void {
  const TaskManager = getTaskManager();
  if (!TaskManager) return;
  TaskManager.defineTask<TaskData>(NOTIFICATION_TASK, async ({ data, error }) => {
    if (error || !data || data.actionIdentifier !== ACTION_LATER) return;
    const request = data.notification?.request;
    if (!request?.content) return;
    await snooze(request.content);
    if (request.identifier) await getNotifications()?.dismissNotificationAsync(request.identifier).catch(() => {});
  });
}

export async function registerNotificationTask(): Promise<void> {
  try {
    await getNotifications()?.registerTaskAsync(NOTIFICATION_TASK);
  } catch {
    // se a tarefa não estiver disponível, o botão funciona com o app aberto
  }
}
