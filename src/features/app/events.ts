/**
 * Avisos simples entre partes do app (ex.: "treino terminou" → reagendar as notificações),
 * sem acoplar os módulos.
 */
export type AppEvent = 'sessionFinished' | 'checkinSaved' | 'dataReplaced';

type Listener = (event: AppEvent) => void;

const listeners = new Set<Listener>();

export function onAppEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitAppEvent(event: AppEvent): void {
  for (const l of listeners) {
    try {
      l(event);
    } catch {
      // um ouvinte com erro não pode derrubar quem emitiu
    }
  }
}
