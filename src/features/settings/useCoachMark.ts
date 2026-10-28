import { useSettings } from '@/stores/settingsStore';

/**
 * Guia de gestos da primeira visita a uma tela.
 * "Ver guias de novo" (Configurações › Gestos) limpa a lista de vistos.
 */
export function useCoachMark(key: string) {
  const seen = useSettings((s) => s.gestures.coachMarksSeen.includes(key));
  const update = useSettings((s) => s.update);
  const loaded = useSettings((s) => s.loaded);

  const dismiss = () => {
    const current = useSettings.getState().gestures.coachMarksSeen;
    if (!current.includes(key)) void update('gestures', { coachMarksSeen: [...current, key] });
  };

  return { visible: loaded && !seen, dismiss };
}
