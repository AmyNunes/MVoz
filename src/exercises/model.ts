import { z } from 'zod';

/** Modelo de um exercício (seção 8.1). O catálogo é validado por este schema nos testes. */

export const CATEGORIES = [
  'warmup',
  'breathing',
  'pitch',
  'resonance',
  'weight',
  'intonation',
  'articulation',
  'speech',
  'cooldown',
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Tipos de medição no player (seção 8.3). */
export const MEASURES = [
  'none',
  'sustain',
  'glide',
  'match',
  'resonance',
  'speech',
  'contour',
  'duration',
  'mission',
] as const;
export type Measure = (typeof MEASURES)[number];

export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type Level = (typeof LEVELS)[number];

export const GOALS = ['feminize', 'masculinize', 'neutral', 'health'] as const;
export type Goal = (typeof GOALS)[number];

const goalScore = z.number().int().min(0).max(3);
const exerciseId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

/** Critério automático de acerto. Cada medição usa só os campos que fazem sentido para ela. */
export const successSchema = z.object({
  /** Segundos seguidos no alvo para contar uma repetição (sustain, match, resonance). */
  holdSec: z.number().positive().optional(),
  /** Tolerância em cents em relação à nota-alvo (match). */
  centsTolerance: z.number().positive().optional(),
  /** Extensão mínima de um deslize, em semitons (glide). */
  minRangeSt: z.number().positive().optional(),
  /** Fração mínima do tempo de voz dentro da faixa (speech). */
  inTargetRatio: z.number().min(0).max(1).optional(),
  /** Erro médio máximo em relação à curva, em semitons (contour). */
  maxMeanErrorSt: z.number().positive().optional(),
});
export type Success = z.infer<typeof successSchema>;

/**
 * Contagem de um passo, nos exercícios cujos passos pedem coisas diferentes (ex.: canudo:
 * 3 "uuu" de 5 s, depois 5 deslizes). `main` = o critério do próprio exercício; `sound` = som
 * contínuo por `seconds`; `glide` = deslize de `minRangeSt` semitons; `voice` = `seconds` de voz
 * somados no passo (cantarolar, dizer frases; as pausas não zeram); `manual` = só o "Fiz".
 */
export const STEP_COUNTS = ['main', 'sound', 'glide', 'voice', 'manual'] as const;
export const stepTargetSchema = z.object({
  /** Índice do passo (0 = o primeiro). */
  step: z.number().int().nonnegative(),
  count: z.enum(STEP_COUNTS),
  reps: z.number().int().positive(),
  /** O que se conta, no plural, para "2 de 5 deslizes". */
  unit: z.string().min(2),
  seconds: z.number().positive().optional(),
  minRangeSt: z.number().positive().optional(),
  /** Passo opcional (ex.: "Variação: …"): mostra o progresso, mas não precisa para terminar. */
  optional: z.boolean().optional(),
});
export type StepTarget = z.infer<typeof stepTargetSchema>;

export const exerciseSchema = z.object({
  id: exerciseId,
  /** Código curto da spec (W1, P3, R6…). */
  code: z.string().regex(/^[A-Z]\d$/),
  name: z.string().min(3),
  category: z.enum(CATEGORIES),
  /** Relevância por objetivo, de 0 a 3. */
  goals: z.object({ feminize: goalScore, masculinize: goalScore, neutral: goalScore, health: goalScore }),
  level: z.enum(LEVELS),
  /** Duração sugerida. */
  durationSec: z.number().int().positive(),
  /** Repetições sugeridas (quando o exercício é por repetição). */
  reps: z.number().int().positive().optional(),
  /** O que se conta, no plural ("ciclos", "deslizes"); sem isso, "repetições". */
  repsUnit: z.string().min(2).optional(),
  measure: z.enum(MEASURES),
  /** Tom-alvo: nenhum, a faixa-alvo inteira ou uma nota (o centro da faixa). */
  target: z.enum(['none', 'band', 'note']),
  /** Ressonância: para onde levar. `goal` = conforme o objetivo (até o Guia existir, mais clara). */
  direction: z.enum(['brighter', 'darker', 'goal']).optional(),
  success: successSchema,
  /** Pergunta de autoavaliação de 1 a 5 no fim (o que o app não consegue medir). */
  selfRating: z.string().optional(),
  /** Habilidade treinada (rodízio semanal, seção 9.3). */
  skill: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  /** Limite de tempo por segurança: o player para sozinho. */
  maxSec: z.number().int().positive().optional(),
  /** O que é e para que serve, em 1–2 frases. */
  about: z.string().min(10),
  steps: z.array(z.string().min(3)).min(3).max(6),
  /** O que o app mede neste exercício. */
  measures: z.string().min(3),
  mistakes: z.array(z.string().min(3)).min(1),
  cautions: z.array(z.string().min(3)),
  easier: exerciseId.optional(),
  harder: exerciseId.optional(),
  /** Exercícios que costumam vir antes. */
  prerequisites: z.array(exerciseId),
  /** Ids de `texts.ts` (exercícios de fala). */
  readingTexts: z.array(z.string()).optional(),
  /**
   * Tarefas diferentes em sequência (ex.: canudo: "uuu", deslizes, cantarolar). Os passos sem
   * contagem viram "Antes:"/"Depois:" da tarefa. Sem isso, os passos são o "como fazer" de uma
   * tarefa só, mostrados de uma vez, com um contador único.
   */
  stepTargets: z.array(stepTargetSchema).optional(),
  /** De onde vem (detalhes em PESQUISA.md). */
  source: z.string().min(3),
});
export type Exercise = z.infer<typeof exerciseSchema>;
