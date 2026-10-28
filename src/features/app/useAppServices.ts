import { useEffect } from 'react';

type Service = () => (() => void) | void;

/**
 * Serviços que rodam enquanto o app está aberto (reagendar notificações,
 * atualizar o widget, fila offline da IA…). Cada fase registra o seu.
 */
const services: Service[] = [];

export function registerAppService(service: Service): void {
  services.push(service);
}

export function useAppServices(): void {
  useEffect(() => {
    const cleanups = services.map((s) => s());
    return () => {
      for (const c of cleanups) c?.();
    };
  }, []);
}
