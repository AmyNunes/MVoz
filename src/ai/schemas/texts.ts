import { z } from 'zod';

/** Saída de `readingText` (seção 12.5): um texto curto de leitura em voz alta. */
export const readingTextSchema = z.object({
  title: z.string().min(1).max(80),
  paragraphs: z.array(z.string().min(1).max(600)).min(1).max(6),
});
export type AiReadingText = z.infer<typeof readingTextSchema>;

/** Saída de `speakingPrompts` (seção 12.5): perguntas para responder em voz alta. */
export const speakingPromptsSchema = z.object({
  prompts: z
    .array(z.object({ questionPt: z.string().min(1).max(200), tipPt: z.string().max(200).default('') }))
    .min(1)
    .max(10),
});
export type SpeakingPrompts = z.infer<typeof speakingPromptsSchema>;
