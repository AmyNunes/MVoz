import { registerNotificationService } from '@/notifications/service';

let registered = false;

/** Registra os serviços que rodam com o app aberto (uma vez, na abertura). */
export function registerServices(): void {
  if (registered) return;
  registered = true;
  registerNotificationService();
}
