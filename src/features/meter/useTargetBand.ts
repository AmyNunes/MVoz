import { useSettings } from '@/stores/settingsStore';

import { shiftBand, withHigh, withLow, type Band } from './band';

/** Faixa-alvo do Medidor, salva em Configurações › Treino. `band` é `null` quando está desligada. */
export function useTargetBand() {
  const training = useSettings((s) => s.training);
  const update = useSettings((s) => s.update);
  const current: Band = { lowHz: training.targetLowHz, highHz: training.targetHighHz };

  const save = (next: Band) => update('training', { targetLowHz: next.lowHz, targetHighHz: next.highHz });

  return {
    enabled: training.targetEnabled,
    current,
    band: training.targetEnabled ? current : null,
    setEnabled: (targetEnabled: boolean) => update('training', { targetEnabled }),
    shift: (semitones: number) => save(shiftBand(current, semitones)),
    setLow: (hz: number) => save(withLow(current, hz)),
    setHigh: (hz: number) => save(withHigh(current, hz)),
  };
}
