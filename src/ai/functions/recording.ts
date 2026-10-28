import { withCache } from '../cache';
import { callAI } from '../client';
import type { UserContext } from '../context';
import { explainRecordingPrompt, type ExplainRecordingInput } from '../prompts/recording';
import { recordingExplanationSchema, type RecordingExplanation } from '../schemas/recording';
import { validExerciseIds } from '../validate';

/**
 * "Perguntar à IA sobre esta gravação" (seção 10.8). Vai só as métricas, nunca o áudio.
 * Cache: a mesma gravação com as mesmas medidas e o mesmo contexto não gasta tokens de novo.
 */
export async function explainRecording(
  input: ExplainRecordingInput & { recordingId: string },
  ctx: UserContext,
): Promise<{ data: RecordingExplanation; cached: boolean }> {
  const { recordingId, ...prompt } = input;
  const key = { recordingId, metrics: prompt.metrics, ctx };
  const result = await withCache('explainRecording', key, recordingExplanationSchema, async () => {
    const { data } = await callAI('explainRecording', explainRecordingPrompt(prompt, ctx), recordingExplanationSchema, { temperature: 0.4 });
    return data;
  });
  return { ...result, data: { ...result.data, suggestedExerciseIds: validExerciseIds(result.data.suggestedExerciseIds) } };
}
