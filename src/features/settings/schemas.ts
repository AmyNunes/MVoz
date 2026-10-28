import { z } from 'zod';

import { PROVIDER_IDS, PROVIDERS } from '@/ai/providers';
import { notificationSettingsSchema } from '@/notifications/types';

/*
 * Cada grupo de configurações é salvo numa chave da tabela `settings`.
 * Todo campo tem `.catch(padrão)`: se faltar ou vier inválido, usa o padrão
 * sem perder os outros campos.
 */

export const appearanceSchema = z
  .object({
    themePreference: z.enum(['system', 'light', 'dark']).catch('system'),
  })
  .catch({ themePreference: 'system' as const });

const aiDefaults = {
  provider: 'gemini' as const,
  baseUrl: PROVIDERS.gemini.baseUrl,
  model: '',
  inputPricePerMillion: null,
  outputPricePerMillion: null,
  monthlyLimit: null,
  jsonModeUnsupported: [],
};

export const aiSettingsSchema = z
  .object({
    provider: z.enum(PROVIDER_IDS).catch(aiDefaults.provider),
    baseUrl: z.string().catch(aiDefaults.baseUrl),
    model: z.string().catch(aiDefaults.model),
    /** US$ por milhão de tokens (opcional, só para estimar o gasto). */
    inputPricePerMillion: z.number().nonnegative().nullable().catch(null),
    outputPricePerMillion: z.number().nonnegative().nullable().catch(null),
    /** Limite mensal em US$. Ao chegar a 100%, as funções de IA pausam. */
    monthlyLimit: z.number().positive().nullable().catch(null),
    /** "url|modelo" que recusaram `response_format: json_object`. */
    jsonModeUnsupported: z.array(z.string()).catch([]),
  })
  .catch(aiDefaults);

const trainingDefaults = {
  targetEnabled: false,
  targetLowHz: 165,
  targetHighHz: 200,
  dailyLimitMinutes: 15,
  mandatoryWarmup: true,
  notation: 'solfege' as const,
  checkinWeekday: 0,
  toneTimbre: 'soft' as const,
};

/**
 * Treino (seção 10.10, item 4). A faixa-alvo começa desligada até o Guia calcular a da etapa;
 * guardada em Hz (seção 7.2). Limite diário (seção 14.1): iniciante 10–15 min.
 */
export const trainingSchema = z
  .object({
    targetEnabled: z.boolean().catch(trainingDefaults.targetEnabled),
    targetLowHz: z.number().min(60).max(500).catch(trainingDefaults.targetLowHz),
    targetHighHz: z.number().min(60).max(500).catch(trainingDefaults.targetHighHz),
    dailyLimitMinutes: z.number().int().min(5).max(60).catch(trainingDefaults.dailyLimitMinutes),
    /** Aquecimento obrigatório antes de tom e ressonância no treino do plano (seção 14.6). */
    mandatoryWarmup: z.boolean().catch(trainingDefaults.mandatoryWarmup),
    /** "Sol 3" ou "G3". */
    notation: z.enum(['solfege', 'letter']).catch(trainingDefaults.notation),
    /** Dia do check-in semanal (0 = domingo). */
    checkinWeekday: z.number().int().min(0).max(6).catch(trainingDefaults.checkinWeekday),
    /** Timbre do tom de referência. */
    toneTimbre: z.enum(['soft', 'bright']).catch(trainingDefaults.toneTimbre),
  })
  .catch(trainingDefaults);

const gesturesDefaults = { haptics: true, coachMarksSeen: [] as string[] };

/** Gestos (seção 10.10, item 5): vibração sutil e desligável, e guias de gesto já vistos. */
export const gesturesSchema = z
  .object({
    haptics: z.boolean().catch(gesturesDefaults.haptics),
    coachMarksSeen: z.array(z.string()).catch(gesturesDefaults.coachMarksSeen),
  })
  .catch(gesturesDefaults);

export const settingsGroups = {
  appearance: appearanceSchema,
  ai: aiSettingsSchema,
  training: trainingSchema,
  gestures: gesturesSchema,
  /** Central de Notificações (seção 11). */
  notifications: notificationSettingsSchema,
};

export type SettingsGroups = typeof settingsGroups;
export type SettingsGroup = keyof SettingsGroups;
export type Settings = { [K in SettingsGroup]: z.output<SettingsGroups[K]> };
export type AppearanceSettings = Settings['appearance'];
export type AISettings = Settings['ai'];
export type TrainingSettings = Settings['training'];
