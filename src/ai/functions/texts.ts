import { withCache } from '../cache';
import { callAI } from '../client';
import type { UserContext } from '../context';
import { readingTextPrompt, speakingPromptsPrompt, type ReadingTextInput, type SpeakingPromptsInput } from '../prompts/texts';
import { readingTextSchema, speakingPromptsSchema, type AiReadingText, type SpeakingPrompts } from '../schemas/texts';

/**
 * Textos novos para os exercícios de fala (seção 12.5). `seed` muda a cada "Outro texto",
 * para o cache guardar cada um sem repetir.
 */
export async function readingText(input: ReadingTextInput & { seed: number }, ctx: UserContext): Promise<AiReadingText> {
  const { seed, ...prompt } = input;
  const { data } = await withCache('readingText', { prompt, seed, goal: ctx.profile?.goal ?? null }, readingTextSchema, async () => {
    const result = await callAI('readingText', readingTextPrompt(prompt, ctx), readingTextSchema, { temperature: 0.9 });
    return result.data;
  });
  return data;
}

export async function speakingPrompts(input: SpeakingPromptsInput & { seed: number }, ctx: UserContext): Promise<SpeakingPrompts> {
  const { seed, ...prompt } = input;
  const { data } = await withCache('speakingPrompts', { prompt, seed }, speakingPromptsSchema, async () => {
    const result = await callAI('speakingPrompts', speakingPromptsPrompt(prompt, ctx), speakingPromptsSchema, { temperature: 0.9 });
    return result.data;
  });
  return data;
}
