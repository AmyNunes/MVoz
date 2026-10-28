import type { PlayerResult } from '@/components/player/PlayerScaffold';
import { finishSession, insertExerciseResult, startSession } from '@/db/sessionsRepo';
import { emitAppEvent } from '@/features/app/events';

/**
 * Salva um exercício feito fora de um treino ("Fazer agora" no detalhe): vira uma sessão
 * de origem `single` com um resultado. `stoppedForPain` vem do "Senti dor · parar".
 */
export async function saveSingleExercise(result: PlayerResult, stoppedForPain = false): Promise<void> {
  const sessionId = await startSession({ origin: 'single', startedAt: result.startedAt });
  await insertExerciseResult({ ...result, sessionId });
  await finishSession(sessionId, {
    minutes: result.durationSec / 60,
    feeling: result.rating.feeling,
    discomfort: result.rating.discomfort,
    stoppedForPain,
  });
  emitAppEvent('sessionFinished');
}
