import { AppState } from 'react-native';

import { onAppEvent } from '@/features/app/events';
import { registerAppService } from '@/features/app/useAppServices';
import { useSettings } from '@/stores/settingsStore';

import { registerNotificationTask } from './backgroundTask';
import { configureForegroundPresentation, listenNotificationResponses } from './handlers';
import { requestReschedule } from './scheduler';

/**
 * Liga as notificações ao app: reagenda ao abrir, ao voltar para o app, ao mudar as
 * configurações, ao terminar um treino ou check-in e ao restaurar um backup (seção 11).
 */
export function registerNotificationService(): void {
  registerAppService(() => {
    configureForegroundPresentation();
    void registerNotificationTask();

    const touchOpened = () => {
      void useSettings.getState().update('notifications', { lastOpenedAt: new Date().toISOString() });
    };
    touchOpened();
    requestReschedule();

    const stopResponses = listenNotificationResponses();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        touchOpened();
        requestReschedule();
      }
    });
    const stopEvents = onAppEvent(() => requestReschedule());
    const stopSettings = useSettings.subscribe((state, prev) => {
      // lastOpenedAt muda sozinho e já reagenda acima.
      const changed =
        JSON.stringify({ ...state.notifications, lastOpenedAt: null }) !== JSON.stringify({ ...prev.notifications, lastOpenedAt: null }) ||
        state.training.checkinWeekday !== prev.training.checkinWeekday;
      if (changed) requestReschedule();
    });

    return () => {
      stopResponses();
      appState.remove();
      stopEvents();
      stopSettings();
    };
  });
}
