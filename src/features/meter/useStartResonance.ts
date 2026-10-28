import { getBaseline } from '@/db/guideRepo';
import { strings } from '@/i18n/strings';
import { useLoader } from '@/lib/useLoader';

/**
 * Marca "Seu início" na barra de ressonância: o "iii" da gravação inicial (a mesma vogal que o
 * Medidor pede) ou, sem ele, a média da leitura. `null` antes do Guia.
 */
export function useStartResonance(): { spacing: number; label: string } | null {
  const { state } = useLoader(async () => {
    const baseline = await getBaseline('first');
    return baseline?.metrics ?? null;
  });
  if (state.status !== 'success' || !state.data) return null;
  const { vowelI, speechSpacing } = state.data;
  if (vowelI?.spacing) return { spacing: vowelI.spacing, label: strings.meter.resonance.startVowel };
  return speechSpacing ? { spacing: speechSpacing, label: strings.meter.resonance.startSpeech } : null;
}
