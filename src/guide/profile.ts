import { z } from 'zod';

import { GOALS } from '@/exercises/model';

/** Respostas do Guia (seção 9.1), guardadas na tabela `profile` (linha única). */

export const GRAMMATICAL_GENDERS = ['f', 'm', 'n'] as const;
export const IDENTITIES = ['trans-woman', 'trans-man', 'nonbinary', 'other', 'undisclosed'] as const;
export const HORMONES = ['none', 'estrogen', 'testosterone', 'undisclosed'] as const;
export const EXPERIENCES = ['new', 'some', 'long'] as const;
export const SLP = ['yes', 'past', 'no'] as const;
export const DAILY_MINUTES = [10, 15, 20, 30] as const;
export const HEALTH_FLAGS = ['hoarseness', 'pain', 'reflux', 'smoking', 'professional'] as const;

export type GrammaticalGender = (typeof GRAMMATICAL_GENDERS)[number];
export type HealthFlag = (typeof HEALTH_FLAGS)[number];

export const profileSchema = z.object({
  goal: z.enum(GOALS),
  grammaticalGender: z.enum(GRAMMATICAL_GENDERS),
  identity: z.enum(IDENTITIES).nullable(),
  hormones: z.enum(HORMONES).nullable(),
  recentSurgery: z.boolean(),
  surgeryCleared: z.boolean(),
  experience: z.enum(EXPERIENCES),
  slp: z.enum(SLP),
  dailyMinutes: z.number().int().positive(),
  healthFlags: z.array(z.enum(HEALTH_FLAGS)),
  /** Mandar contexto (identidade, hormônios) nas perguntas à IA (seção 12.2). */
  aiIncludeContext: z.boolean(),
});
export type Profile = z.infer<typeof profileSchema>;

/** Iniciante fica em até 15 min por dia (seção 14.1). */
export const BEGINNER_MAX_MINUTES = 15;
/** Acima de 10 min, o treino é dividido em 2 blocos (seção 9.1). */
export const SINGLE_BLOCK_MAX_MINUTES = 10;

export function effectiveDailyMinutes(profile: Pick<Profile, 'experience' | 'dailyMinutes'>): number {
  return profile.experience === 'new' ? Math.min(profile.dailyMinutes, BEGINNER_MAX_MINUTES) : profile.dailyMinutes;
}

export function blockCount(minutes: number): 1 | 2 {
  return minutes > SINGLE_BLOCK_MAX_MINUTES ? 2 : 1;
}

/** Plano bloqueado até a liberação da equipe médica (cirurgia nos últimos 6 meses, seção 14.6). */
export function planBlocked(profile: Pick<Profile, 'recentSurgery' | 'surgeryCleared'> | null): boolean {
  return !!profile && profile.recentSurgery && !profile.surgeryCleared;
}
