import { BEGINNER_MAX_MINUTES, type Profile } from './profile';

/** Perguntas do Guia, uma por tela (seção 9.1). */
export const QUESTIONS = [
  'goal',
  'grammaticalGender',
  'identity',
  'hormones',
  'surgery',
  'surgeryCleared',
  'experience',
  'slp',
  'minutes',
  'health',
] as const;
export type QuestionId = (typeof QUESTIONS)[number];

/** Respostas em andamento. */
export type GuideDraft = Partial<Profile>;

/** Opcionais: têm "Pular". */
export const OPTIONAL_QUESTIONS: readonly QuestionId[] = ['identity', 'hormones'];

/** A da liberação médica só aparece se houve cirurgia. */
export function visibleQuestions(draft: GuideDraft): QuestionId[] {
  return QUESTIONS.filter((q) => q !== 'surgeryCleared' || draft.recentSurgery === true);
}

export function isAnswered(id: QuestionId, draft: GuideDraft): boolean {
  switch (id) {
    case 'goal':
      return draft.goal !== undefined;
    case 'grammaticalGender':
      return draft.grammaticalGender !== undefined;
    case 'identity':
      return draft.identity !== undefined;
    case 'hormones':
      return draft.hormones !== undefined;
    case 'surgery':
      return draft.recentSurgery !== undefined;
    case 'surgeryCleared':
      return draft.surgeryCleared !== undefined;
    case 'experience':
      return draft.experience !== undefined;
    case 'slp':
      return draft.slp !== undefined;
    case 'minutes':
      return draft.dailyMinutes !== undefined;
    case 'health':
      return draft.healthFlags !== undefined;
  }
}

/** Respostas completas viram o perfil (opcionais puladas ficam `null`). */
export function toProfile(draft: GuideDraft): Profile | null {
  const required = visibleQuestions(draft).filter((q) => !OPTIONAL_QUESTIONS.includes(q));
  if (!required.every((q) => isAnswered(q, draft))) return null;
  const { goal, grammaticalGender, experience, slp, dailyMinutes, healthFlags } = draft;
  if (!goal || !grammaticalGender || !experience || !slp || !dailyMinutes || !healthFlags) return null;
  return {
    goal,
    grammaticalGender,
    identity: draft.identity ?? null,
    hormones: draft.hormones ?? null,
    recentSurgery: draft.recentSurgery ?? false,
    surgeryCleared: draft.recentSurgery ? (draft.surgeryCleared ?? false) : false,
    experience,
    slp,
    // Iniciante: até 15 min por dia (seção 14.1).
    dailyMinutes: experience === 'new' ? Math.min(dailyMinutes, BEGINNER_MAX_MINUTES) : dailyMinutes,
    healthFlags,
    aiIncludeContext: draft.aiIncludeContext ?? false,
  };
}
