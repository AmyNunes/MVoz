import type { Exercise } from '@/exercises/model';
import type { ResultDetails } from '@/exercises/results';
import { strings } from '@/i18n/strings';
import { formatClock } from '@/lib/format';

const s = strings.player.summary;

/** "4,5" (uma casa, vírgula). */
export const oneDecimal = (n: number) => n.toFixed(1).replace('.', ',');

/** Linhas do resumo no fim do exercício (e o único retorno no modo "só resumo"). */
export function summaryLines(exercise: Exercise, elapsedSec: number, reps: number, details: ResultDetails): string[] {
  const lines = [s.time(formatClock(elapsedSec))];
  if (reps > 0) lines.push(s.reps(reps));
  const segment = details.segment;
  if (segment?.inTargetRatio != null) lines.push(s.inTarget(Math.round(segment.inTargetRatio * 100)));
  if (segment?.medianHz != null && exercise.measure !== 'duration') lines.push(s.median(Math.round(segment.medianHz)));
  if (details.attempts?.length) lines.push(s.bestDuration(oneDecimal(Math.max(...details.attempts.map((a) => a.seconds)))));
  if (details.glideRanges?.length) lines.push(s.bestGlide(oneDecimal(Math.max(...details.glideRanges))));
  if (details.contourErrors?.length) lines.push(s.contour(oneDecimal(Math.min(...details.contourErrors))));
  if (details.resonance) lines.push(s.resonance(oneDecimal(details.resonance.bestChangePct)));
  return lines;
}

/** Ordem das tentativas do teste de /s/, /z/ e "a" (B2): 2 de cada. */
const SZ_SEQUENCE = ['/s/', '/s/', '/z/', '/z/', '"a"', '"a"'];

/** Qual som fazer agora no teste de duração (só no B2). */
export function durationLabel(exercise: Exercise, attempt: number): string | null {
  return exercise.id === 'sz-mpt' ? (SZ_SEQUENCE[attempt] ?? null) : null;
}

/** Relação s/z (B2): melhor /s/ ÷ melhor /z/. Referência em adultos: 0,99 a 1,40. */
export function szRatio(values: readonly number[]): number | null {
  const s = Math.max(...values.slice(0, 2), 0);
  const z = Math.max(...values.slice(2, 4), 0);
  return s > 0 && z > 0 ? s / z : null;
}
