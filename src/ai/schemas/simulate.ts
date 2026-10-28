import { z } from 'zod';

/** Um ponto da curva de tom: segundos desde o começo e Hz. */
export const contourPointSchema = z.object({ t: z.number(), hz: z.number() });
export type ContourPoint = z.infer<typeof contourPointSchema>;

/** Saída de `simulateExercise` (seção 12.5): a IA "simula" o exercício em texto. */
export const simulationSchema = z.object({
  overviewPt: z.string().min(1),
  steps: z
    .array(
      z.object({
        titlePt: z.string().min(1),
        instructionPt: z.string().min(1),
        durationSec: z.number().nonnegative().catch(30),
        feelPt: z.string().default(''),
        soundPt: z.string().default(''),
        checkPt: z.string().default(''),
      }),
    )
    .min(1)
    .max(8),
  analogyPt: z.string().default(''),
  mistakes: z.array(z.object({ mistakePt: z.string().min(1), fixPt: z.string().min(1) })).default([]),
  successSignsPt: z.array(z.string().min(1)).default([]),
  /** Só nos exercícios de tom ou entonação. O app valida antes de usar. */
  contour: z.object({ points: z.array(contourPointSchema) }).nullable().optional(),
  safetyPt: z.string().default(''),
});
export type Simulation = z.infer<typeof simulationSchema>;
