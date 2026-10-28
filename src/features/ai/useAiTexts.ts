import { useState } from 'react';

import { toAIError } from '@/ai/client';
import { readingText, speakingPrompts } from '@/ai/functions/texts';
import type { Exercise } from '@/exercises/model';
import type { ReadingText } from '@/exercises/texts';
import { strings } from '@/i18n/strings';
import { showSnackbar } from '@/stores/snackbarStore';

import { loadUserContext } from './userContext';

const t = strings.ai.texts;
/** Exercícios de fala cujo texto são perguntas para responder (Conversa treinada, monólogo). */
const QUESTION_EXERCISES = ['conversation', 'monologue'];

export type AiTextKind = 'reading' | 'questions';

/** Nos exercícios de fala, a IA pode gerar textos novos (seção 8.4): perguntas ou leitura. */
export function aiTextKind(exercise: Pick<Exercise, 'id' | 'category' | 'readingTexts'>): AiTextKind | null {
  if (exercise.category !== 'speech' || !exercise.readingTexts?.length) return null;
  return QUESTION_EXERCISES.includes(exercise.id) ? 'questions' : 'reading';
}

async function generateText(kind: AiTextKind, seed: number): Promise<ReadingText> {
  const ctx = await loadUserContext();
  if (kind === 'questions') {
    const result = await speakingPrompts({ stageName: ctx.stage?.name ?? null, situations: t.situations, count: 6, seed }, ctx);
    return { title: `${t.tag} · ${t.questionsTitle}`, lines: result.prompts.map((p) => (p.tipPt ? `${p.questionPt}\n${p.tipPt}` : p.questionPt)) };
  }
  const result = await readingText({ theme: t.themes[seed % t.themes.length], focus: 'mixed', size: 'short', seed }, ctx);
  return { title: `${t.tag} · ${result.title}`, lines: result.paragraphs };
}

/** Textos gerados nesta tela (não ficam salvos). `generate` devolve se deu certo. */
export function useAiTexts(kind: AiTextKind | null) {
  const [texts, setTexts] = useState<ReadingText[]>([]);
  const [loading, setLoading] = useState(false);

  const generate = async (): Promise<boolean> => {
    if (!kind || loading) return false;
    setLoading(true);
    try {
      const text = await generateText(kind, texts.length);
      setTexts((all) => [...all, text]);
      return true;
    } catch (error) {
      showSnackbar(toAIError(error).messagePt);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { texts, loading, generate, label: kind === 'questions' ? t.newQuestions : t.newText };
}
