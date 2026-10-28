import { z } from 'zod';

/** Saída de `explainRecording` (seção 12.5). */
export const recordingExplanationSchema = z.object({
  summaryPt: z.string().min(1),
  strengthsPt: z.array(z.string().min(1)).max(5).default([]),
  focusPt: z.array(z.string().min(1)).max(5).default([]),
  /** Só ids do catálogo: o app descarta os outros. */
  suggestedExerciseIds: z.array(z.string()).default([]),
});
export type RecordingExplanation = z.infer<typeof recordingExplanationSchema>;
