import { strings } from '@/i18n/strings';

import { oneDecimal } from './summary';
import type { StepCounter } from './useStepCounter';

const p = strings.player;

export type CounterView = {
  /** Texto ao lado do anel ("2 de 5 deslizes"). */
  label: string;
  /** 0–1: o anel. */
  progress: number;
  /** O exercício está completo (o "Terminar" vira o botão principal). */
  done: boolean;
  /** "Segurando: 3,2 s de 5 s" ou "Deslize agora: 3,2 de 5 semitons", enquanto ainda não contou. */
  holding: string | null;
};

/**
 * O que o anel e o texto mostram: a contagem do passo (exercícios com passos diferentes),
 * a do exercício (um contador só) ou só o tempo.
 */
export function counterView(input: {
  steps: Pick<StepCounter, 'enabled' | 'target' | 'count' | 'allDone' | 'current'>;
  reps: number;
  repsTarget: number | null;
  elapsedSec: number;
  durationSec: number;
  /** Último passo: a preparação manda "Terminar" em vez de "Próximo passo". */
  lastStep?: boolean;
  /** O que se conta no contador único ("ciclos"). */
  unit?: string;
}): CounterView {
  const { steps, reps, repsTarget, elapsedSec, durationSec, lastStep = false, unit } = input;
  const timeProgress = Math.min(1, elapsedSec / durationSec);
  if (steps.enabled) {
    const t = steps.target;
    // Passo de preparação (sem som para medir): diz o que fazer, em vez de ficar vazio.
    if (!t) return { label: lastStep ? p.prepLast : p.prepStep, progress: timeProgress, done: steps.allDone, holding: null };
    // Tempo com voz ("12 de 20 s cantarolando"): conta segundos, não repetições.
    if (t.count === 'voice' && t.seconds) {
      const finished = steps.count >= t.reps;
      const seconds = finished ? t.seconds : Math.min(t.seconds, Math.floor(steps.current));
      return {
        label: p.voiceTime(seconds, t.seconds, t.unit),
        progress: finished ? 1 : Math.min(1, steps.current / t.seconds),
        done: steps.allDone,
        holding: null,
      };
    }
    // O anel enche também durante a repetição em andamento.
    const goal = t.count === 'sound' ? t.seconds : t.count === 'glide' ? t.minRangeSt : undefined;
    const going = !!goal && steps.current > 0 && steps.count < t.reps;
    const partial = going && goal ? Math.min(1, steps.current / goal) : 0;
    return {
      label: p.stepCount(Math.min(steps.count, t.reps), t.reps, t.unit),
      progress: Math.min(1, (steps.count + partial) / t.reps),
      done: steps.allDone,
      holding: !going || !goal ? null : t.count === 'sound' ? p.holding(oneDecimal(steps.current), goal) : p.glidingNow(oneDecimal(steps.current), goal),
    };
  }
  if (repsTarget) return { label: p.repOf(Math.min(reps, repsTarget), repsTarget, unit), progress: Math.min(1, reps / repsTarget), done: reps >= repsTarget, holding: null };
  return { label: reps > 0 ? p.repsDone(reps) : '', progress: timeProgress, done: elapsedSec >= durationSec, holding: null };
}
