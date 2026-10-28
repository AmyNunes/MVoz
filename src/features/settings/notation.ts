import { formatNote } from '@/lib/notes';
import { useSettings } from '@/stores/settingsStore';

/** Nome da nota na notação escolhida em Configurações › Treino ("Sol 3" ou "G3"). */
export function formatUserNote(hz: number): string {
  return formatNote(hz, useSettings.getState().training.notation);
}
