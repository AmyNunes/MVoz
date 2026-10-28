import { z } from 'zod';

import type { Goal } from '@/exercises/model';

import type { Profile } from './profile';

/**
 * Etapas do plano por objetivo (seção 9.2). Nomes e textos ficam em `strings.guide.stages`.
 * Os marcos para avançar são conferidos no check-in semanal (seção 9.3).
 */

export const MILESTONES = [
  /** 5 treinos sem desconforto. */
  'calm-sessions',
  /** Um deslize de 8+ semitons sem quebras grandes. */
  'glide-range',
  /** Tempo de "a" registrado (teste de /s/, /z/ e "a"). */
  'mpt',
  /** Ressonância do /i/ ≥ 5% além do início (na direção do objetivo) e 3 treinos de ressonância com essa melhora. */
  'resonance-gain',
  /** Manter o tom-alvo em 80% das tentativas (3 treinos). */
  'pitch-hold',
  /** Leitura do check-in com a mediana na faixa e o percentil 10 acima do piso. */
  'reading-band',
  /** Autoavaliação de peso ≥ 4/5 em 3 treinos. */
  'weight',
  /** Pergunta × afirmação (ou finais descendentes) com o final certo em 9 de 10. */
  'intonation',
  /** Monólogo de 1 min com ≥ 70% na faixa. */
  'monologue',
  /** Esforço ≤ 3/10 e "combina comigo" ≥ 7/10 em 2 check-ins seguidos. */
  'comfort',
  /** Exercícios de Função Vocal feitos ~6 semanas (20+ treinos). */
  'function',
  /** 3 treinos de projeção sem desconforto. */
  'projection',
  /** 6 treinos da etapa sem desconforto forte. */
  'practice',
] as const;
export type MilestoneKind = (typeof MILESTONES)[number];

export const STAGE_IDS = [
  'fundamentals',
  'resonance',
  'resonance-dark',
  'resonance-flex',
  'resonance-healthy',
  'pitch',
  'pitch-zone',
  'weight',
  'weight-projection',
  'intonation',
  'integration',
  'integration-switch',
  'fundamentals-breath',
  'vocal-function',
  'projection',
  'maintenance',
] as const;
export type StageId = (typeof STAGE_IDS)[number];

export const planStageSchema = z.object({
  id: z.enum(STAGE_IDS),
  exercises: z.array(z.string()),
  /** Exercício de medição da etapa: fica fixo, sem rodízio (seção 9.3). */
  measureExerciseId: z.string().nullable(),
  minWeeks: z.number().int().nonnegative(),
  /** Duração típica em semanas (`null` = contínua). */
  typicalWeeks: z.tuple([z.number(), z.number()]).nullable(),
  milestones: z.array(z.enum(MILESTONES)),
  /** A faixa-alvo sobe (ou desce) nesta etapa. */
  pitchMoves: z.boolean(),
  /** Todo treino tem um exercício de fala com a habilidade da etapa. */
  speech: z.boolean(),
});
export type PlanStage = z.infer<typeof planStageSchema>;

const stage = (
  id: StageId,
  exercises: string[],
  options: Partial<Omit<PlanStage, 'id' | 'exercises'>> = {},
): PlanStage => ({
  id,
  exercises,
  measureExerciseId: null,
  minWeeks: 2,
  typicalWeeks: [2, 4],
  milestones: ['practice'],
  pitchMoves: false,
  speech: true,
  ...options,
});

const maintenance = (exercises: string[]) =>
  stage('maintenance', exercises, { minWeeks: 0, typicalWeeks: null, milestones: [] });

/** Fundamentos: W1–W4, B1–B3 e P1 (na masculinização, sem o W4 e, com testosterona, com o M7). */
function fundamentals({ silentLaugh = true, extra = [] }: { silentLaugh?: boolean; extra?: string[] } = {}): PlanStage {
  const warmups = ['straw-phonation', 'lip-trill', 'release-yawn-sigh', ...(silentLaugh ? ['silent-laugh'] : [])];
  return stage('fundamentals', [...warmups, 'diaphragmatic-breathing', 'sz-mpt', 'breath-groups', 'pitch-glides', ...extra], {
    minWeeks: 1,
    typicalWeeks: [1, 2],
    milestones: ['calm-sessions', 'glide-range', 'mpt'],
    speech: false,
  });
}

/** Etapas do plano para o objetivo (com testosterona, a masculinização inclui o M7). */
export function stagesFor(goal: Goal, profile: Pick<Profile, 'hormones'>): PlanStage[] {
  switch (goal) {
    case 'feminize':
      return [
        fundamentals(),
        stage('resonance', ['big-dog-small-dog', 'whisper-siren', 'smile-vowels', 'forward-tongue', 'f2-vowels', 'chewing-hum', 'easy-onset', 'speech-ladder'], {
          measureExerciseId: 'f2-vowels',
          milestones: ['resonance-gain'],
        }),
        stage('pitch', ['target-hold', 'hum-chant-speak', 'automatic-speech', 'pitch-floor', 'f2-vowels'], {
          measureExerciseId: 'target-hold',
          typicalWeeks: [3, 6],
          milestones: ['pitch-hold', 'reading-band'],
          pitchMoves: true,
        }),
        stage('weight', ['light-heavy', 'volume-no-weight', 'light-twang', 'target-hold'], {
          measureExerciseId: 'light-heavy',
          milestones: ['weight', 'reading-band'],
        }),
        stage('intonation', ['question-statement', 'stress-pairs', 'contour-shadowing', 'expressive-reading', 'cork', 'light-consonants'], {
          measureExerciseId: 'question-statement',
          milestones: ['intonation'],
        }),
        stage('integration', ['speech-ladder', 'monologue', 'conversation', 'phone-messages', 'missions'], {
          measureExerciseId: 'monologue',
          typicalWeeks: [4, 8],
          milestones: ['monologue', 'comfort'],
        }),
        maintenance(['straw-phonation', 'target-hold', 'f2-vowels', 'standard-passage']),
      ];
    case 'masculinize':
      return [
        fundamentals({ silentLaugh: false, extra: profile.hormones === 'testosterone' ? ['smooth-breaks'] : [] }),
        stage('resonance-dark', ['low-larynx', 'lip-rounding', 'big-dog-small-dog', 'f2-vowels', 'chest-resonance'], {
          measureExerciseId: 'f2-vowels',
          milestones: ['resonance-gain'],
        }),
        stage('pitch', ['new-low', 'target-hold', 'automatic-speech'], {
          measureExerciseId: 'target-hold',
          typicalWeeks: [3, 6],
          milestones: ['pitch-hold', 'reading-band'],
          pitchMoves: true,
        }),
        stage('weight-projection', ['light-heavy', 'projection'], { measureExerciseId: 'light-heavy', milestones: ['weight', 'projection'] }),
        stage('intonation', ['falling-endings', 'stress-pairs', 'expressive-reading'], {
          measureExerciseId: 'falling-endings',
          milestones: ['intonation'],
        }),
        stage('integration', ['speech-ladder', 'standard-passage', 'monologue', 'conversation', 'phone-messages', 'missions'], {
          measureExerciseId: 'monologue',
          typicalWeeks: [4, 8],
          milestones: ['monologue', 'comfort'],
        }),
        maintenance(['straw-phonation', 'target-hold', 'low-larynx', 'standard-passage']),
      ];
    case 'neutral':
      return [
        fundamentals(),
        stage('resonance-flex', ['resonance-scale', 'big-dog-small-dog', 'f2-vowels'], { measureExerciseId: 'resonance-scale' }),
        stage('pitch-zone', ['target-hold', 'hum-chant-speak', 'automatic-speech'], {
          measureExerciseId: 'target-hold',
          typicalWeeks: [3, 6],
          milestones: ['pitch-hold', 'reading-band'],
          pitchMoves: true,
        }),
        stage('weight', ['light-heavy'], { measureExerciseId: 'light-heavy', milestones: ['weight'] }),
        stage('intonation', ['question-statement', 'stress-pairs', 'contour-shadowing', 'expressive-reading'], {
          measureExerciseId: 'question-statement',
          milestones: ['intonation'],
        }),
        stage('integration-switch', ['resonance-scale', 'light-heavy', 'question-statement', 'monologue', 'conversation'], {
          measureExerciseId: 'monologue',
          typicalWeeks: [4, 8],
          milestones: ['monologue', 'comfort'],
        }),
        maintenance(['straw-phonation', 'resonance-scale', 'target-hold', 'standard-passage']),
      ];
    case 'health':
      return [
        stage('fundamentals-breath', ['straw-phonation', 'lip-trill', 'release-yawn-sigh', 'silent-laugh', 'diaphragmatic-breathing', 'sz-mpt', 'breath-groups', 'projection'], {
          minWeeks: 1,
          typicalWeeks: [1, 2],
          milestones: ['calm-sessions', 'mpt'],
          speech: false,
        }),
        stage('vocal-function', ['vocal-function'], {
          measureExerciseId: 'vocal-function',
          minWeeks: 6,
          typicalWeeks: [6, 6],
          milestones: ['function'],
          speech: false,
        }),
        stage('resonance-healthy', ['chewing-hum', 'easy-onset']),
        stage('projection', ['projection', 'volume-no-weight'], { measureExerciseId: 'projection', milestones: ['projection'] }),
        maintenance(['straw-phonation', 'vocal-function', 'chewing-hum', 'standard-passage']),
      ];
  }
}
